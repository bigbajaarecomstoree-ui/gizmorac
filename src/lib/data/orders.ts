import type { Order as OrderRow, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

function toOrder(r: OrderRow): Order {
  let items: OrderItem[] = [];
  try {
    items = JSON.parse(r.items);
  } catch {
    items = [];
  }
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    status: r.status as OrderStatus,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    address: r.address,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    items,
    subtotal: r.subtotal,
    discount: r.discount,
    shipping: r.shipping,
    total: r.total,
    paymentMethod: r.paymentMethod,
    couponCode: r.couponCode,
    customerId: r.customerId,
    createdAt: r.createdAt.toISOString(),
  };
}

// --- date helpers (IST-aware so "today" matches the Indian store's day) ---

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type DateRange = "today" | "yesterday" | "7d" | "30d" | "month" | "all";

export const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

/** The UTC instant corresponding to IST midnight of the given day. */
function istDayStart(d = new Date()): Date {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

export function dateBounds(range: DateRange): { gte?: Date; lt?: Date } {
  const now = new Date();
  const todayStart = istDayStart(now);
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "today":
      return { gte: todayStart };
    case "yesterday":
      return { gte: new Date(todayStart.getTime() - day), lt: todayStart };
    case "7d":
      return { gte: new Date(todayStart.getTime() - 6 * day) };
    case "30d":
      return { gte: new Date(todayStart.getTime() - 29 * day) };
    case "month": {
      const ist = new Date(now.getTime() + IST_OFFSET_MS);
      ist.setUTCDate(1);
      ist.setUTCHours(0, 0, 0, 0);
      return { gte: new Date(ist.getTime() - IST_OFFSET_MS) };
    }
    case "all":
    default:
      return {};
  }
}

export interface OrderFilter {
  status?: OrderStatus | "all";
  range?: DateRange;
  q?: string;
}

export async function getOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toOrder);
}

export async function getFilteredOrders(filter: OrderFilter): Promise<Order[]> {
  const where: Prisma.OrderWhereInput = {};
  if (filter.status && filter.status !== "all") where.status = filter.status;

  const bounds = dateBounds(filter.range ?? "all");
  if (bounds.gte || bounds.lt) {
    where.createdAt = {};
    if (bounds.gte) where.createdAt.gte = bounds.gte;
    if (bounds.lt) where.createdAt.lt = bounds.lt;
  }

  if (filter.q) {
    const q = filter.q.trim();
    where.OR = [
      { orderNumber: { contains: q } },
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const rows = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? toOrder(row) : null;
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  const row = await prisma.order.findUnique({ where: { orderNumber } });
  return row ? toOrder(row) : null;
}

export async function getOrdersByCustomerId(
  customerId: string,
): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

/**
 * A customer's orders, matched by their account id OR email — so orders placed
 * as a guest with the same email (before sign-up) still appear in their history.
 */
export async function getOrdersForCustomer(
  customerId: string,
  email: string,
): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: {
      OR: [{ customerId }, { email: email.toLowerCase() }],
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

export interface AdminStats {
  productCount: number;
  orderCount: number;
  pendingOrders: number;
  revenue: number;
  lowStock: number;
  customerCount: number;
}

const REVENUE_STATUSES = { notIn: ["Cancelled", "Returned", "Refunded"] };

export async function getAdminStats(): Promise<AdminStats> {
  const [
    productCount,
    orderCount,
    pendingOrders,
    lowStock,
    customerCount,
    revenueAgg,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "Pending" } }),
    prisma.product.count({ where: { stock: { lte: 10 } } }),
    prisma.customer.count(),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: REVENUE_STATUSES },
    }),
  ]);

  return {
    productCount,
    orderCount,
    pendingOrders,
    lowStock,
    customerCount,
    revenue: revenueAgg._sum.total ?? 0,
  };
}

export interface ReportSummary {
  range: DateRange;
  orders: number;
  revenue: number;
  units: number;
  avgOrderValue: number;
  byStatus: { status: OrderStatus; count: number; value: number }[];
}

export async function getReportSummary(
  range: DateRange,
): Promise<ReportSummary> {
  const bounds = dateBounds(range);
  const where: Prisma.OrderWhereInput = {};
  if (bounds.gte || bounds.lt) {
    where.createdAt = {};
    if (bounds.gte) where.createdAt.gte = bounds.gte;
    if (bounds.lt) where.createdAt.lt = bounds.lt;
  }

  const rows = await prisma.order.findMany({ where });
  const orders = rows.map(toOrder);

  const counted = orders.filter(
    (o) => !["Cancelled", "Returned", "Refunded"].includes(o.status),
  );
  const revenue = counted.reduce((s, o) => s + o.total, 0);
  const units = counted.reduce(
    (s, o) => s + o.items.reduce((n, i) => n + i.qty, 0),
    0,
  );

  const byStatus = ORDER_STATUSES.map((status) => {
    const group = orders.filter((o) => o.status === status);
    return {
      status,
      count: group.length,
      value: group.reduce((s, o) => s + o.total, 0),
    };
  });

  return {
    range,
    orders: orders.length,
    revenue,
    units,
    avgOrderValue: counted.length ? Math.round(revenue / counted.length) : 0,
    byStatus,
  };
}
