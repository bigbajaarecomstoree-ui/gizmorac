// Customer risk profile updater (spec §12). Recomputes from live counts;
// STRICT_REVIEW only takes effect when ffFraudScoring is on (else level stays
// NORMAL but the signal is still recorded).

import { prisma } from "@/lib/prisma";
import { computeRiskLevel } from "./risk";

export async function recomputeRiskProfile(customerId: string): Promise<{ ok: boolean; level?: string; returnRate?: number }> {
  const ff = await prisma.storeSetting.findFirst({ select: { ffFraudScoring: true } });

  const [orderCount, disputeCount, returnCount, existing] = await Promise.all([
    prisma.order.count({ where: { customerId } }),
    prisma.dispute.count({ where: { customerId } }),
    prisma.orderItem.count({ where: { order: { customerId }, returnReason: { not: null } } }),
    prisma.customerRiskProfile.findUnique({ where: { customerId } }),
  ]);

  const fraudScore = existing?.fraudScore ?? 0;
  const r = computeRiskLevel({ orderCount, returnCount, disputeCount, fraudScore });
  const level = ff?.ffFraudScoring ? r.level : "NORMAL";

  await prisma.customerRiskProfile.upsert({
    where: { customerId },
    create: { customerId, orderCount, returnCount, disputeCount, returnRate: r.returnRate, fraudScore, level: level as never },
    update: { orderCount, returnCount, disputeCount, returnRate: r.returnRate, level: level as never },
  });
  return { ok: true, level, returnRate: r.returnRate };
}
