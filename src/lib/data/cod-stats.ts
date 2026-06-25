import { prisma } from "@/lib/prisma";

export interface CodStats {
  totalCodOrders: number;
  advanceCollectedPaise: number;
  pendingCollectionPaise: number;
  deliveredCodOrders: number;
  rtoOrders: number;
  rtoRatePct: number;
  codConversionPct: number;
  outstandingCodPaise: number;
}

const NOT_RTO = ["NONE"];

/** COD & RTO KPIs. Indexed on paymentMethod / rtoStatus (no full scans). */
export async function getCodStats(): Promise<CodStats> {
  const cod = { paymentMethod: "COD" as const };
  const [
    totalCodOrders,
    deliveredCodOrders,
    rtoOrders,
    advance,
    outstanding,
  ] = await Promise.all([
    prisma.order.count({ where: cod }),
    prisma.order.count({ where: { ...cod, status: "Delivered" } }),
    prisma.order.count({ where: { ...cod, rtoStatus: { notIn: NOT_RTO } } }),
    // Advance actually collected = advance on orders where it cleared.
    prisma.order.aggregate({
      where: { ...cod, paymentStatus: { in: ["PartiallyPaid", "Paid"] } },
      _sum: { codAdvancePaise: true },
    }),
    // Outstanding = balance still to collect on delivery (not yet collected, live orders).
    prisma.order.aggregate({
      where: { ...cod, deliveryPaymentStatus: "PENDING", status: { notIn: ["Cancelled", "Returned"] } },
      _sum: { codRemainingPaise: true },
    }),
  ]);

  const advanceCollectedPaise = advance._sum.codAdvancePaise ?? 0;
  const outstandingCodPaise = outstanding._sum.codRemainingPaise ?? 0;
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    totalCodOrders,
    advanceCollectedPaise,
    pendingCollectionPaise: outstandingCodPaise,
    deliveredCodOrders,
    rtoOrders,
    rtoRatePct: pct(rtoOrders, totalCodOrders),
    codConversionPct: pct(deliveredCodOrders, totalCodOrders),
    outstandingCodPaise,
  };
}

export interface CodOrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: string;
  total: number;
  codAdvancePaise: number;
  codRemainingPaise: number;
  paymentStatus: string;
  deliveryPaymentStatus: string;
  rtoStatus: string;
  status: string;
}

/** Most recent COD orders for the management list (bounded — no unbounded scan). */
export async function getCodOrders(limit = 50): Promise<CodOrderRow[]> {
  const rows = await prisma.order.findMany({
    where: { paymentMethod: "COD" },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    select: {
      id: true, orderNumber: true, createdAt: true, firstName: true, lastName: true,
      total: true, codAdvancePaise: true, codRemainingPaise: true,
      paymentStatus: true, deliveryPaymentStatus: true, rtoStatus: true, status: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    createdAt: r.createdAt.toISOString(),
    customer: `${r.firstName} ${r.lastName}`.trim(),
    total: r.total,
    codAdvancePaise: r.codAdvancePaise,
    codRemainingPaise: r.codRemainingPaise,
    paymentStatus: r.paymentStatus,
    deliveryPaymentStatus: r.deliveryPaymentStatus,
    rtoStatus: r.rtoStatus,
    status: r.status,
  }));
}
