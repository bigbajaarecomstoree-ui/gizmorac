// Audit reporting (spec §17). Read-only views over order_status_history, the
// canonical per-transition audit. Never mutates; rows are never deleted.

import type { EntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Full transition trail for one order (order + its items/disputes/refunds). */
export function getOrderAuditTrail(orderId: string) {
  return prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });
}

/** Transition history for a single entity. */
export function getEntityHistory(entityType: EntityType, entityId: string) {
  return prisma.orderStatusHistory.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
  });
}

/** Counts grouped by action target over a window — for an audit report. */
export async function auditSummary(sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const rows = await prisma.orderStatusHistory.groupBy({
    by: ["entityType", "newState"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  return rows.map((r) => ({ entityType: r.entityType, newState: r.newState, count: r._count._all }));
}
