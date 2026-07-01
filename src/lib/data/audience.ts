import { prisma } from "@/lib/prisma";
import { NON_REVENUE } from "./revenue";

export type AudienceSegment =
  | "subscribers"
  | "customers"
  | "repeat"
  | "spent5000"
  | "highvalue"
  | "recent30";

const SPENT_THRESHOLD = 5000;
const HIGH_VALUE = 10000;
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

export interface AudienceRow {
  email: string;
  name: string;
  orders: number;
  spent: number;
  lastOrder: string;
}

interface Rollup {
  name: string;
  orders: number;
  spent: number;
  lastAt: number;
  recent: boolean;
}

/** Per-email purchase rollup across registered + guest orders. */
async function buildRollups(): Promise<Map<string, Rollup>> {
  const [customers, orders] = await Promise.all([
    prisma.customer.findMany({ select: { email: true, fullName: true } }),
    prisma.order.findMany({ select: { email: true, total: true, status: true, createdAt: true } }),
  ]);
  const since = Date.now() - RECENT_MS;
  const byEmail = new Map<string, Rollup>();
  for (const c of customers) {
    byEmail.set(c.email.toLowerCase(), { name: c.fullName, orders: 0, spent: 0, lastAt: 0, recent: false });
  }
  for (const o of orders) {
    const key = o.email.toLowerCase();
    const cur = byEmail.get(key) ?? { name: "", orders: 0, spent: 0, lastAt: 0, recent: false };
    cur.orders += 1;
    if (!NON_REVENUE.includes(o.status)) cur.spent += o.total;
    const t = o.createdAt.getTime();
    if (t > cur.lastAt) cur.lastAt = t;
    if (t >= since) cur.recent = true;
    byEmail.set(key, cur);
  }
  return byEmail;
}

function inSegment(r: Rollup, segment: AudienceSegment): boolean {
  switch (segment) {
    case "repeat":
      return r.orders > 1;
    case "spent5000":
      return r.spent > SPENT_THRESHOLD;
    case "highvalue":
      return r.spent >= HIGH_VALUE;
    case "recent30":
      return r.recent;
    default:
      return r.orders > 0; // "customers"
  }
}

/** Counts for each audience segment (for the admin cards). */
export async function getAudienceCounts(): Promise<Record<AudienceSegment, number>> {
  const [subscribers, roll] = await Promise.all([prisma.subscriber.count(), buildRollups()]);
  const buyers = [...roll.values()].filter((r) => r.orders > 0);
  return {
    subscribers,
    customers: buyers.length,
    repeat: buyers.filter((r) => inSegment(r, "repeat")).length,
    spent5000: buyers.filter((r) => inSegment(r, "spent5000")).length,
    highvalue: buyers.filter((r) => inSegment(r, "highvalue")).length,
    recent30: buyers.filter((r) => inSegment(r, "recent30")).length,
  };
}

/** Rows for a segment's CSV export (sorted by spend desc). */
export async function getAudienceRows(segment: AudienceSegment): Promise<AudienceRow[]> {
  if (segment === "subscribers") {
    const subs = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true },
    });
    return subs.map((s) => ({ email: s.email, name: "", orders: 0, spent: 0, lastOrder: "" }));
  }
  const roll = await buildRollups();
  return [...roll.entries()]
    .map(([email, r]) => ({ email, ...r }))
    .filter((r) => r.orders > 0 && inSegment(r, segment))
    .sort((a, b) => b.spent - a.spent)
    .map((r) => ({
      email: r.email,
      name: r.name,
      orders: r.orders,
      spent: r.spent,
      lastOrder: r.lastAt ? new Date(r.lastAt).toISOString() : "",
    }));
}
