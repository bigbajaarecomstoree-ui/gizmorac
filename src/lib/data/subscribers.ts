import { prisma } from "@/lib/prisma";

export interface Subscriber {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

/** Newsletter subscribers, newest first. */
export async function getSubscribers(): Promise<Subscriber[]> {
  const rows = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface GrowthPoint {
  date: string;
  label: string;
  count: number;
}

/** Daily new-subscriber counts over the last `days` (IST), for the growth chart. */
export async function getSubscriberGrowth(days = 30): Promise<GrowthPoint[]> {
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const label = (d: Date) =>
    d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

  const buckets = new Map<string, GrowthPoint>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    buckets.set(key(d), { date: key(d), label: label(d), count: 0 });
  }
  const since = new Date(now);
  since.setDate(now.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.subscriber.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  for (const r of rows) {
    const b = buckets.get(key(r.createdAt));
    if (b) b.count += 1;
  }
  return [...buckets.values()];
}
