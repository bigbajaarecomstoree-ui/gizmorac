import type { Customer as CustomerRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Customer, CustomerWithStats } from "@/lib/types";
import { NON_REVENUE } from "./revenue";

// --- shared customer classification (same rules on list + detail) ---
const VIP_SPEND = 10000;
const VIP_ORDERS = 5;
const HIGH_RISK_RETURN_RATE = 0.4;

export interface CustomerSignals {
  orderCount: number;
  totalSpent: number;
  cancels: number;
  returns: number;
  codOrders: number;
}

export function isHighRiskCustomer(s: CustomerSignals): boolean {
  const rate = s.orderCount ? s.returns / s.orderCount : 0;
  return s.cancels >= 3 || rate >= HIGH_RISK_RETURN_RATE;
}

export function isVipCustomer(s: CustomerSignals): boolean {
  return s.totalSpent >= VIP_SPEND || s.orderCount >= VIP_ORDERS;
}

/** Whether the customer leans on COD for more than half their orders. */
export function isCodRiskCustomer(s: CustomerSignals): boolean {
  return s.orderCount > 0 && s.codOrders / s.orderCount > 0.5;
}

function map(r: CustomerRow): Customer {
  return {
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    marketingOptIn: r.marketingOptIn,
    deactivatedAt: r.deactivatedAt ? r.deactivatedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

interface EmailRollup {
  count: number;
  spent: number;
  latestAt: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  cancels: number;
  returns: number;
  codOrders: number;
}

/**
 * Every customer with order rollups. Orders are matched by email so guest
 * orders placed with the same email before sign-up are still counted. When a
 * customer hasn't saved a profile address, the latest order's shipping address
 * is used as a fallback so the directory/export stays useful.
 */
export async function getCustomersWithStats(): Promise<CustomerWithStats[]> {
  const [customers, orders] = await Promise.all([
    prisma.customer.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        email: true,
        total: true,
        status: true,
        paymentMethod: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        createdAt: true,
      },
    }),
  ]);

  const byEmail = new Map<string, EmailRollup>();
  for (const o of orders) {
    const key = o.email.toLowerCase();
    const cur =
      byEmail.get(key) ??
      ({ count: 0, spent: 0, latestAt: 0, address: "", city: "", state: "", pincode: "", phone: "", cancels: 0, returns: 0, codOrders: 0 } as EmailRollup);
    cur.count += 1;
    if (!NON_REVENUE.includes(o.status)) cur.spent += o.total;
    if (o.status === "Cancelled") cur.cancels += 1;
    if (o.status === "Returned" || o.status === "Refunded") cur.returns += 1;
    if (o.paymentMethod !== "PhonePe" && !NON_REVENUE.includes(o.status)) cur.codOrders += 1;
    const ts = o.createdAt.getTime();
    if (ts >= cur.latestAt) {
      cur.latestAt = ts;
      cur.address = o.address;
      cur.city = o.city;
      cur.state = o.state;
      cur.pincode = o.pincode;
      cur.phone = o.phone;
    }
    byEmail.set(key, cur);
  }

  return customers.map((c) => {
    const r = byEmail.get(c.email.toLowerCase());
    const base = map(c);
    return {
      ...base,
      phone: base.phone || r?.phone || "",
      address: base.address || r?.address || "",
      city: base.city || r?.city || "",
      state: base.state || r?.state || "",
      pincode: base.pincode || r?.pincode || "",
      orderCount: r?.count ?? 0,
      totalSpent: r?.spent ?? 0,
      cancels: r?.cancels ?? 0,
      returns: r?.returns ?? 0,
      codOrders: r?.codOrders ?? 0,
    };
  });
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = await prisma.customer.findUnique({ where: { id } });
  return row ? map(row) : null;
}

// --- customer activity timeline ------------------------------------------

export type TimelineKind = "created" | "placed" | "progress" | "good" | "bad";

export interface TimelineEvent {
  id: string;
  label: string;
  order: string; // owning order number, or "" for account events
  at: string;
  kind: TimelineKind;
}

const STATE_META: Record<string, { label: string; kind: TimelineKind }> = {
  CONFIRMED: { label: "Payment confirmed", kind: "progress" },
  PROCESSING: { label: "Processing", kind: "progress" },
  PACKED: { label: "Packed", kind: "progress" },
  SHIPPED: { label: "Shipped", kind: "progress" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", kind: "progress" },
  DELIVERED: { label: "Delivered", kind: "good" },
  CANCELLED: { label: "Cancelled", kind: "bad" },
  RETURNED: { label: "Returned", kind: "bad" },
  REFUNDED: { label: "Refunded", kind: "bad" },
};

/**
 * A merged, newest-first activity feed for a customer: account creation, each
 * order placed, and every order status transition (from the audit log).
 */
export async function getCustomerTimeline(
  createdAt: string,
  orders: { id: string; orderNumber: string; createdAt: string }[],
  limit = 25,
): Promise<TimelineEvent[]> {
  const orderIds = orders.map((o) => o.id);
  const numById = new Map(orders.map((o) => [o.id, o.orderNumber]));
  const history = orderIds.length
    ? await prisma.orderStatusHistory.findMany({
        where: { orderId: { in: orderIds }, entityType: "ORDER" },
        orderBy: { createdAt: "desc" },
        select: { id: true, orderId: true, newState: true, createdAt: true },
      })
    : [];

  const events: TimelineEvent[] = [
    { id: "acct", label: "Account created", order: "", at: createdAt, kind: "created" },
  ];
  for (const o of orders) {
    events.push({ id: `placed-${o.id}`, label: "Order placed", order: o.orderNumber, at: o.createdAt, kind: "placed" });
  }
  for (const h of history) {
    const meta = STATE_META[h.newState];
    if (!meta) continue;
    events.push({
      id: h.id,
      label: meta.label,
      order: numById.get(h.orderId ?? "") ?? "",
      at: h.createdAt.toISOString(),
      kind: meta.kind,
    });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
