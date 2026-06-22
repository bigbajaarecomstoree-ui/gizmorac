// Dispute lifecycle (spec §7). Dispute = evidence/investigation/communication
// container; no automatic refunds or replacements. Appeal cap + SLA enforced.

import type { ReturnReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transitionEntity, type Actor, type TransitionResult } from "./transition-engine";
import { canAppeal, allDisputeItemsResolved } from "./dispute-policy";

async function disputeSettings() {
  const s = await prisma.storeSetting.findFirst({ select: { maxAppeals: true, investigationSlaHours: true } });
  return { maxAppeals: s?.maxAppeals ?? 1, slaHours: s?.investigationSlaHours ?? 48 };
}

export async function raiseDispute(input: {
  orderId: string;
  email: string;
  customerId?: string | null;
  reason?: ReturnReason;
  category?: string;
  description?: string;
  orderItemIds: string[];
  actor: Actor;
}): Promise<{ ok: boolean; disputeId?: string; disputeNumber?: string; error?: string }> {
  const cfg = await disputeSettings();
  const count = await prisma.dispute.count();
  const disputeNumber = `DSP-${String(count + 1).padStart(5, "0")}`;

  const dispute = await prisma.dispute.create({
    data: {
      disputeNumber,
      orderId: input.orderId,
      email: input.email,
      customerId: input.customerId ?? null,
      reason: input.reason ?? null,
      category: input.category ?? "",
      description: input.description ?? "",
      status: "NONE", // engine moves NONE → RAISED so the creation is audited
      maxAppeals: cfg.maxAppeals,
      items: { create: input.orderItemIds.map((id) => ({ orderItemId: id })) },
    },
  });

  const t = await transitionEntity({ kind: "dispute", id: dispute.id, to: "RAISED", actor: input.actor, reason: "dispute raised" });
  if (!t.ok) return { ok: false, error: t.error };
  return { ok: true, disputeId: dispute.id, disputeNumber };
}

export async function investigateDispute(disputeId: string, actor: Actor = { role: "SUPPORT" }): Promise<TransitionResult> {
  const cfg = await disputeSettings();
  await prisma.dispute.update({ where: { id: disputeId }, data: { slaDueAt: new Date(Date.now() + cfg.slaHours * 3_600_000) } });
  return transitionEntity({ kind: "dispute", id: disputeId, to: "UNDER_INVESTIGATION", actor, reason: "investigation started" });
}

export async function escalateDispute(disputeId: string, actor: Actor = { role: "SUPPORT" }): Promise<TransitionResult> {
  await prisma.dispute.update({ where: { id: disputeId }, data: { escalatedAt: new Date() } });
  return transitionEntity({ kind: "dispute", id: disputeId, to: "ESCALATED", actor, reason: "escalated (SLA / complexity)" });
}

export async function rejectDispute(disputeId: string, actor: Actor = { role: "MANAGER" }, reason?: string): Promise<TransitionResult> {
  return transitionEntity({ kind: "dispute", id: disputeId, to: "REJECTED", actor, reason: reason ?? "dispute rejected" });
}

/** Customer appeal — allowed once (configurable). Re-opens investigation (manager). */
export async function appealDispute(disputeId: string, actor: Actor = { role: "CUSTOMER" }): Promise<{ ok: boolean; error?: string }> {
  const d = await prisma.dispute.findUnique({ where: { id: disputeId }, select: { status: true, appealsUsed: true, maxAppeals: true } });
  if (!d) return { ok: false, error: "Dispute not found." };
  if (!canAppeal({ status: d.status, appealsUsed: d.appealsUsed, maxAppeals: d.maxAppeals })) {
    return { ok: false, error: "Appeal not allowed (cap reached or dispute not rejected)." };
  }
  const t = await transitionEntity({ kind: "dispute", id: disputeId, to: "APPEALED", actor, reason: "customer appeal" });
  if (!t.ok) return { ok: false, error: t.error };
  await prisma.dispute.update({ where: { id: disputeId }, data: { appealsUsed: { increment: 1 } } });
  const t2 = await transitionEntity({ kind: "dispute", id: disputeId, to: "UNDER_INVESTIGATION", actor: { role: "MANAGER" }, reason: "appeal accepted for re-investigation" });
  return { ok: t2.ok, error: t2.error };
}

/** Close the dispute once ALL its items are resolved (mixed outcomes valid). */
export async function closeDisputeIfResolved(disputeId: string, actor: Actor = { role: "SUPPORT" }): Promise<{ ok: boolean; error?: string }> {
  const items = await prisma.disputeItem.findMany({ where: { disputeId }, select: { outcome: true } });
  if (!allDisputeItemsResolved(items.map((i) => i.outcome))) {
    return { ok: false, error: "Not all dispute items are resolved yet." };
  }
  const t = await transitionEntity({ kind: "dispute", id: disputeId, to: "CLOSED", actor, reason: "all items resolved" });
  if (t.ok) await prisma.dispute.update({ where: { id: disputeId }, data: { closedAt: new Date() } });
  return { ok: t.ok, error: t.error };
}
