import type { Order } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { NON_REVENUE } from "./revenue";

/** Best-selling product by revenue across fulfilled orders. */
export interface BestSeller {
  name: string;
  revenue: number;
  units: number;
}

export function bestSeller(orders: Order[]): BestSeller | null {
  const map = new Map<string, BestSeller>();
  for (const o of orders) {
    if (NON_REVENUE.includes(o.status)) continue;
    for (const it of o.items) {
      const cur = map.get(it.id) ?? { name: it.name, revenue: 0, units: 0 };
      cur.revenue += it.price * it.qty;
      cur.units += it.qty;
      map.set(it.id, cur);
    }
  }
  let top: BestSeller | null = null;
  for (const v of map.values()) if (!top || v.revenue > top.revenue) top = v;
  return top;
}

/** Repeat & high-risk counts derived from order history (matched by email). */
export interface CustomerSegments {
  repeat: number;
  highRisk: number;
}

export function customerSegments(orders: Order[]): CustomerSegments {
  const byEmail = new Map<string, Order[]>();
  for (const o of orders) {
    const key = o.email.toLowerCase();
    const arr = byEmail.get(key) ?? [];
    arr.push(o);
    byEmail.set(key, arr);
  }
  let repeat = 0;
  let highRisk = 0;
  for (const list of byEmail.values()) {
    if (list.length > 1) repeat++;
    const cancels = list.filter((o) => o.status === "Cancelled").length;
    const returns = list.filter((o) => o.status === "Returned" || o.status === "Refunded").length;
    const returnRate = list.length ? (returns / list.length) * 100 : 0;
    if (cancels >= 3 || returnRate >= 40) highRisk++;
  }
  return { repeat, highRisk };
}

/** This-month vs last-month revenue (calendar months), with % change. */
export interface RevenueTrend {
  thisMonth: number;
  lastMonth: number;
  pct: number | null;
}

export function revenueTrend(orders: Order[], now = new Date()): RevenueTrend {
  const y = now.getFullYear();
  const m = now.getMonth();
  const lm = m === 0 ? 11 : m - 1;
  const lmY = m === 0 ? y - 1 : y;
  let thisMonth = 0;
  let lastMonth = 0;
  for (const o of orders) {
    if (NON_REVENUE.includes(o.status)) continue;
    const d = new Date(o.createdAt);
    if (d.getFullYear() === y && d.getMonth() === m) thisMonth += o.total;
    else if (d.getFullYear() === lmY && d.getMonth() === lm) lastMonth += o.total;
  }
  const pct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  return { thisMonth, lastMonth, pct };
}

/** Share of orders that ended in a refund. */
export interface RefundStats {
  refunded: number;
  total: number;
  rate: number;
}

export function refundStats(orders: Order[]): RefundStats {
  const total = orders.length;
  const refunded = orders.filter((o) => o.status === "Refunded").length;
  const rate = total ? Math.round((refunded / total) * 100) : 0;
  return { refunded, total, rate };
}

/** Customers who signed up within the window. */
export async function getNewCustomerCount(days = 30): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.customer.count({ where: { createdAt: { gte: since } } });
}
