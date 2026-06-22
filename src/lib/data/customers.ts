import type { Customer as CustomerRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Customer, CustomerWithStats } from "@/lib/types";

const NON_REVENUE = ["Cancelled", "Returned", "Refunded"];

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
      ({ count: 0, spent: 0, latestAt: 0, address: "", city: "", state: "", pincode: "", phone: "" } as EmailRollup);
    cur.count += 1;
    if (!NON_REVENUE.includes(o.status)) cur.spent += o.total;
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
    };
  });
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const row = await prisma.customer.findUnique({ where: { id } });
  return row ? map(row) : null;
}
