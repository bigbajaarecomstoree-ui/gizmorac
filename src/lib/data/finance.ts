import { prisma } from "@/lib/prisma";

export interface FinanceEntry {
  id: string;
  date: string; // ISO
  direction: "in" | "out";
  amount: number;
  category: string;
  note: string;
}

function toEntry(r: {
  id: string;
  date: Date;
  direction: string;
  amount: number;
  category: string;
  note: string;
}): FinanceEntry {
  return {
    id: r.id,
    date: r.date.toISOString(),
    direction: r.direction === "out" ? "out" : "in",
    amount: r.amount,
    category: r.category,
    note: r.note,
  };
}

export async function getFinanceEntries(limit = 200): Promise<FinanceEntry[]> {
  const rows = await prisma.financeEntry.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toEntry);
}

export async function getFinanceEntryCount(): Promise<number> {
  return prisma.financeEntry.count();
}

/**
 * Cash/bank balance as of an instant (entries strictly before it). Pass the
 * start of the day *after* the target date to make that date inclusive; omit
 * for the all-time current balance.
 */
export async function getBalanceAsOf(instant?: Date): Promise<number> {
  const where = instant ? { date: { lt: instant } } : {};
  const [ins, outs] = await Promise.all([
    prisma.financeEntry.aggregate({
      _sum: { amount: true },
      where: { ...where, direction: "in" },
    }),
    prisma.financeEntry.aggregate({
      _sum: { amount: true },
      where: { ...where, direction: "out" },
    }),
  ]);
  return (ins._sum.amount ?? 0) - (outs._sum.amount ?? 0);
}

/** Money in / out within a date window. */
export async function getFinanceFlow(bounds: {
  gte?: Date;
  lt?: Date;
}): Promise<{ in: number; out: number }> {
  const dateWhere: { gte?: Date; lt?: Date } = {};
  if (bounds.gte) dateWhere.gte = bounds.gte;
  if (bounds.lt) dateWhere.lt = bounds.lt;
  const where = bounds.gte || bounds.lt ? { date: dateWhere } : {};
  const [ins, outs] = await Promise.all([
    prisma.financeEntry.aggregate({
      _sum: { amount: true },
      where: { ...where, direction: "in" },
    }),
    prisma.financeEntry.aggregate({
      _sum: { amount: true },
      where: { ...where, direction: "out" },
    }),
  ]);
  return { in: ins._sum.amount ?? 0, out: outs._sum.amount ?? 0 };
}
