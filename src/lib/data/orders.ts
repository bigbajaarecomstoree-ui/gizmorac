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
  "Replacement",
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
    gstin: r.gstin,
    companyName: r.companyName,
    items,
    subtotal: r.subtotal,
    discount: r.discount,
    instantDiscount: r.instantDiscount,
    instantOffer: r.instantOffer,
    shipping: r.shipping,
    total: r.total,
    paymentMethod: r.paymentMethod,
    paymentStatus: r.paymentStatus,
    paymentRef: r.paymentRef,
    paymentInstrument: r.paymentInstrument,
    paymentError: r.paymentError,
    refundStatus: r.refundStatus,
    refundAmount: r.refundAmount,
    refundRef: r.refundRef,
    shiprocketOrderId: r.shiprocketOrderId,
    shipmentId: r.shipmentId,
    awb: r.awb,
    courier: r.courier,
    trackingUrl: r.trackingUrl,
    labelUrl: r.labelUrl,
    shipmentStatus: r.shipmentStatus,
    returnOrderId: r.returnOrderId,
    returnShipmentId: r.returnShipmentId,
    returnAwb: r.returnAwb,
    returnCourier: r.returnCourier,
    returnTrackingUrl: r.returnTrackingUrl,
    returnStatus: r.returnStatus,
    replacementOrderId: r.replacementOrderId,
    replacementShipmentId: r.replacementShipmentId,
    replacementAwb: r.replacementAwb,
    replacementCourier: r.replacementCourier,
    replacementLabelUrl: r.replacementLabelUrl,
    replacementTrackingUrl: r.replacementTrackingUrl,
    replacementStatus: r.replacementStatus,
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

/** Parse a "YYYY-MM-DD" date (from a date input) as IST midnight, as a UTC instant. */
function istDayStartFromYMD(ymd: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return undefined;
  const utcMidnight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(utcMidnight - IST_OFFSET_MS);
}

/**
 * Inclusive custom date range from two "YYYY-MM-DD" strings (IST days). The end
 * date is inclusive — bounds run up to the start of the day *after* `to`.
 */
export function customBounds(
  from?: string,
  to?: string,
): { gte?: Date; lt?: Date } {
  const day = 24 * 60 * 60 * 1000;
  let start = from ? istDayStartFromYMD(from) : undefined;
  let endDay = to ? istDayStartFromYMD(to) : undefined;
  // Be forgiving if the user picks the dates in reverse.
  if (start && endDay && start > endDay) [start, endDay] = [endDay, start];
  const bounds: { gte?: Date; lt?: Date } = {};
  if (start) bounds.gte = start;
  if (endDay) bounds.lt = new Date(endDay.getTime() + day);
  return bounds;
}

/** Orders still in progress (not delivered or closed/reversed). */
export const OPEN_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
];

export interface OrderFilter {
  status?: OrderStatus | "all";
  range?: DateRange;
  /** Custom inclusive "YYYY-MM-DD" window — takes precedence over `range`. */
  from?: string;
  to?: string;
  q?: string;
}

export async function getOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toOrder);
}

export async function getFilteredOrders(filter: OrderFilter): Promise<Order[]> {
  const where: Prisma.OrderWhereInput = {};
  if (filter.status && filter.status !== "all") where.status = filter.status;

  const bounds =
    filter.from || filter.to
      ? customBounds(filter.from, filter.to)
      : dateBounds(filter.range ?? "all");
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

/** The payment method the customer used most recently, to pre-select at checkout. */
export async function getLastPaymentMethod(
  customerId: string,
  email: string,
): Promise<"PhonePe" | "COD" | ""> {
  const last = await prisma.order.findFirst({
    where: { OR: [{ customerId }, { email: email.toLowerCase() }] },
    orderBy: { createdAt: "desc" },
    select: { paymentMethod: true },
  });
  return last?.paymentMethod === "PhonePe" || last?.paymentMethod === "COD"
    ? last.paymentMethod
    : "";
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
  orders: number;
  /** Net Sales = total of orders that count (excludes cancelled/returned/refunded). */
  revenue: number;
  units: number;
  avgOrderValue: number;
  pending: number;
  open: number;
  /** COD already collected = value of Delivered orders. */
  collected: number;
  /** Payment to be received = value of open (undelivered, not cancelled) orders. */
  toReceive: number;
  // --- profit & loss (order-derived) ---
  /** Gross Sales = total of every order placed in the period. */
  grossSales: number;
  cancelled: number;
  returned: number;
  refunded: number;
  /** Cost of goods sold for counted orders (Σ unit cost × qty). */
  cogs: number;
  /** Gross Profit = Net Sales − COGS (before operating expenses). */
  grossProfit: number;
  /** Gross margin %, on net sales. */
  margin: number;
  byStatus: { status: OrderStatus; count: number; value: number }[];
}

/** Build a report summary for an arbitrary date window (UTC-instant bounds). */
async function buildSummary(bounds: {
  gte?: Date;
  lt?: Date;
}): Promise<ReportSummary> {
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

  const collected = orders
    .filter((o) => o.status === "Delivered")
    .reduce((s, o) => s + o.total, 0);
  const toReceive = orders
    .filter((o) => OPEN_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  // P&L: deductions + cost of goods sold (needs product cost prices).
  // Cancelled orders were never real sales → excluded from Gross Sales entirely
  // (not shown as a deduction). Only returns/refunds reduce Gross → Net.
  const sumByStatus = (s: OrderStatus) =>
    orders.filter((o) => o.status === s).reduce((a, o) => a + o.total, 0);
  const cancelled = sumByStatus("Cancelled");
  const returned = sumByStatus("Returned");
  const refunded = sumByStatus("Refunded");
  const grossSales = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((s, o) => s + o.total, 0);

  const costRows = await prisma.product.findMany({
    select: { id: true, cost: true },
  });
  const costById = new Map(costRows.map((p) => [p.id, p.cost]));
  const cogs = counted.reduce(
    (s, o) =>
      s + o.items.reduce((n, i) => n + (costById.get(i.id) ?? 0) * i.qty, 0),
    0,
  );
  const grossProfit = revenue - cogs;
  const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

  return {
    orders: orders.length,
    revenue,
    units,
    avgOrderValue: counted.length ? Math.round(revenue / counted.length) : 0,
    pending: orders.filter((o) => o.status === "Pending").length,
    open: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    collected,
    toReceive,
    grossSales,
    cancelled,
    returned,
    refunded,
    cogs,
    grossProfit,
    margin,
    byStatus,
  };
}

/** Report summary for a named preset range (Today / 7d / This month / …). */
export async function getReportSummary(
  range: DateRange,
): Promise<ReportSummary> {
  return buildSummary(dateBounds(range));
}

/** Report summary for a custom, inclusive "YYYY-MM-DD" date range. */
export async function getReportSummaryBetween(
  from?: string,
  to?: string,
): Promise<ReportSummary> {
  return buildSummary(customBounds(from, to));
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const NON_REVENUE = ["Cancelled", "Returned", "Refunded"];

/** Total fulfilled units sold for a product (parsed from order line items). */
export async function getUnitsSoldForProduct(productId: string): Promise<number> {
  const rows = await prisma.order.findMany({
    where: { status: REVENUE_STATUSES },
    select: { items: true },
  });
  let sold = 0;
  for (const r of rows) {
    try {
      const items = JSON.parse(r.items) as { id: string; qty: number }[];
      for (const it of items) if (it.id === productId) sold += it.qty || 0;
    } catch {
      // ignore malformed item JSON
    }
  }
  return sold;
}

export interface DaySales {
  weekday: string;
  index: number; // 0 = Sunday … 6 = Saturday (IST)
  orders: number;
  units: number;
  revenue: number;
}

/**
 * Orders/units/revenue grouped by day of the week (IST), counting only fulfilled
 * sales. Returned in calendar order (Sun→Sat); callers sort as needed.
 */
export async function getSalesByWeekday(): Promise<DaySales[]> {
  const rows = await prisma.order.findMany({
    where: { status: REVENUE_STATUSES },
  });
  const orders = rows.map(toOrder);

  const buckets: DaySales[] = WEEKDAYS.map((weekday, index) => ({
    weekday,
    index,
    orders: 0,
    units: 0,
    revenue: 0,
  }));

  for (const o of orders) {
    if (NON_REVENUE.includes(o.status)) continue;
    const ist = new Date(new Date(o.createdAt).getTime() + IST_OFFSET_MS);
    const dow = ist.getUTCDay();
    buckets[dow].orders += 1;
    buckets[dow].units += o.items.reduce((n, i) => n + i.qty, 0);
    buckets[dow].revenue += o.total;
  }

  return buckets;
}
