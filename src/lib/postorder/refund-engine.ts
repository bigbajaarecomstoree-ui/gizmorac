// Refund engine (spec §8/§9/§11). Idempotent creation, hard over-refund guard,
// gateway processing with retry → MANUAL_REVIEW, webhook application with
// never-downgrade, and reconciliation of stuck refunds. All money in paise;
// PhonePe is called paise-native (NO ×100 — that lived only in the legacy path).
//
// NOTE: built and unit-tested via its pure cores (money/refund-math/webhook-
// rules). NOT yet wired into the live webhook routes — that happens at the
// switch, gated separately. Operates on the v2 `Refund` model (dark until then).

import { Prisma, type RefundStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { initiateRefund, getRefundStatus } from "@/lib/phonepe";
import { transitionEntity, type Actor } from "./transition-engine";
import { wouldExceedCeiling } from "./refund-math";
import { decideRefundWebhook } from "./webhook-rules";
import { recordWebhookEvent } from "./webhooks";
import { createCreditNoteForRefund } from "./credit-notes";
import { recomputeRiskProfile } from "./risk-service";

const MAX_RETRIES = 2;
const SYSTEM: Actor = { role: "SYSTEM" };

/** Amount paid in paise, tolerant of pre-backfill orders (falls back to rupees×100). */
function amountPaid(order: { amountPaidPaise: number | null; totalPaise: number | null; total: number }): number {
  return order.amountPaidPaise ?? order.totalPaise ?? order.total * 100;
}

export interface CreateRefundInput {
  orderId: string;
  orderItemId?: string | null;
  amountPaise: number;
  reason?: string;
  /** Stable key so retries never create a duplicate refund (spec §15.6). */
  idempotencyKey: string;
  actor: Actor;
  method?: "ORIGINAL" | "MANUAL_UPI" | "MANUAL_NEFT" | "MANUAL_IMPS";
}

export interface RefundOpResult {
  ok: boolean;
  refundId?: string;
  status?: RefundStatus;
  reused?: boolean;
  error?: string;
}

/** Create a refund row (idempotent + over-refund guarded). Does not call the gateway. */
export async function createRefund(input: CreateRefundInput): Promise<RefundOpResult> {
  const existing = await prisma.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { ok: true, refundId: existing.id, status: existing.status, reused: true };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, amountPaidPaise: true, totalPaise: true, total: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const siblings = await prisma.refund.findMany({
    where: { orderId: input.orderId },
    select: { status: true, amountPaise: true },
  });
  if (wouldExceedCeiling(amountPaid(order), siblings, input.amountPaise)) {
    return { ok: false, error: "Refund rejected: would exceed amount paid (over-refund guard)." };
  }

  try {
    const refund = await prisma.refund.create({
      data: {
        orderId: input.orderId,
        orderItemId: input.orderItemId ?? null,
        amountPaise: input.amountPaise,
        status: "PENDING",
        method: (input.method ?? "ORIGINAL") as never,
        reason: input.reason ?? "",
        idempotencyKey: input.idempotencyKey,
      },
    });
    return { ok: true, refundId: refund.id, status: "PENDING" };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return { ok: true, refundId: again.id, status: again.status, reused: true };
    }
    throw e;
  }
}

/** Approve + send a PENDING/FAILED refund to the gateway. Final state arrives via webhook. */
export async function processRefund(refundId: string, actor: Actor = { role: "FINANCE" }): Promise<RefundOpResult> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: { select: { orderNumber: true, paymentMethod: true } } },
  });
  if (!refund) return { ok: false, error: "Refund not found." };
  if (refund.status !== "PENDING" && refund.status !== "FAILED") {
    return { ok: false, error: `Refund is ${refund.status}, not processable.` };
  }

  // COD / manual payout methods don't hit the gateway — route to manual review.
  if (refund.order.paymentMethod !== "PhonePe" || refund.method !== "ORIGINAL") {
    const t = await transitionEntity({ kind: "refund", id: refundId, to: "MANUAL_REVIEW", actor, reason: "manual payout (COD / manual method)" });
    return t.ok ? { ok: true, status: "MANUAL_REVIEW" } : { ok: false, error: t.error };
  }

  const toProcessing = await transitionEntity({
    kind: "refund", id: refundId, to: "PROCESSING", actor,
    amountPaise: refund.amountPaise, reason: "refund approved → processing",
  });
  if (!toProcessing.ok) return { ok: false, error: toProcessing.error };

  const merchantRefundId = refund.refundReference || `RF-${refund.order.orderNumber}-${refund.id.slice(-6)}`;
  const res = await initiateRefund({
    merchantRefundId,
    merchantOrderId: refund.order.orderNumber,
    amountPaise: refund.amountPaise, // paise-native — NO ×100
  });
  await prisma.refundTransaction.create({
    data: {
      refundId,
      attempt: refund.retryCount + 1,
      status: "PROCESSING",
      gatewayReference: res.refundId ?? "",
      requestPayload: JSON.stringify({ merchantRefundId, amountPaise: refund.amountPaise }),
      responsePayload: JSON.stringify(res),
    },
  });

  if (!res.ok) return failRefund(refundId, res.error);

  await prisma.refund.update({
    where: { id: refundId },
    data: { refundReference: merchantRefundId, gatewayReference: res.refundId ?? "" },
  });
  return { ok: true, status: "PROCESSING" };
}

/** Record a gateway failure; retry budget exhausted → MANUAL_REVIEW + admin alert. */
export async function failRefund(refundId: string, reason?: string): Promise<RefundOpResult> {
  const refund = await prisma.refund.findUnique({ where: { id: refundId }, select: { retryCount: true } });
  if (!refund) return { ok: false, error: "Refund not found." };

  await transitionEntity({ kind: "refund", id: refundId, to: "FAILED", actor: SYSTEM, reason: reason ?? "gateway failure" });
  const retries = refund.retryCount + 1;
  await prisma.refund.update({ where: { id: refundId }, data: { retryCount: retries, failureReason: reason ?? "" } });

  if (retries >= MAX_RETRIES) {
    await transitionEntity({ kind: "refund", id: refundId, to: "MANUAL_REVIEW", actor: SYSTEM, reason: "retries exhausted — manual review" });
    await prisma.notificationLog
      .create({ data: { channel: "EMAIL", event: "refund_manual_review", recipient: "admin", state: "PENDING" } })
      .catch(() => {});
    return { ok: true, status: "MANUAL_REVIEW" };
  }
  return { ok: true, status: "FAILED" };
}

/** Apply a refund webhook: dedup → never-downgrade → engine transition. */
export async function applyRefundWebhook(input: {
  provider: string;
  eventId: string;
  merchantRefundId: string;
  incoming: RefundStatus;
  signature?: string;
  payload?: string;
}): Promise<{ applied: boolean; reason: string }> {
  const refund = await prisma.refund.findFirst({ where: { refundReference: input.merchantRefundId } });
  if (!refund) return { applied: false, reason: "unknown refundReference" };

  const dup = await recordWebhookEvent({
    provider: input.provider,
    eventId: input.eventId,
    signature: input.signature,
    gatewayReference: input.merchantRefundId,
    payload: input.payload,
  });
  const decision = decideRefundWebhook({ duplicate: dup.duplicate, current: refund.status, incoming: input.incoming });
  if (!decision.apply) return { applied: false, reason: decision.reason };

  const t = await transitionEntity({ kind: "refund", id: refund.id, to: input.incoming, actor: SYSTEM, reason: `webhook ${input.eventId}` });
  if (!t.ok) return { applied: false, reason: t.error ?? "transition blocked" };

  if (input.incoming === "REFUNDED") {
    await prisma.refund.update({ where: { id: refund.id }, data: { completedAt: new Date() } });
    // GST credit note + customer risk recompute (best-effort, never block settlement).
    await createCreditNoteForRefund({ orderId: refund.orderId, refundId: refund.id, amountPaise: refund.amountPaise }).catch(() => {});
    const ord = await prisma.order.findUnique({ where: { id: refund.orderId }, select: { customerId: true } });
    if (ord?.customerId) await recomputeRiskProfile(ord.customerId).catch(() => {});
    if (refund.orderItemId) {
      // best-effort settlement of the item (full order/payment recompute lands at the switch)
      await transitionEntity({ kind: "item", id: refund.orderItemId, to: "REFUNDED", actor: SYSTEM, reason: "refund completed" });
    }
  } else if (input.incoming === "FAILED") {
    await failRefund(refund.id, "gateway reported FAILED");
  }
  return { applied: true, reason: decision.reason };
}

/** Re-query the gateway for refunds stuck in PROCESSING beyond a threshold (spec §11). */
export async function reconcileStuckRefunds(thresholdMinutes = 30): Promise<{ checked: number; settled: number }> {
  const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);
  const stuck = await prisma.refund.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: cutoff }, refundReference: { not: "" } },
  });
  let settled = 0;
  for (const r of stuck) {
    const { state } = await getRefundStatus(r.refundReference);
    if (state === "Completed") {
      await applyRefundWebhook({
        provider: "phonepe-reconcile",
        eventId: `reconcile-${r.id}-${Date.now()}`,
        merchantRefundId: r.refundReference,
        incoming: "REFUNDED",
      });
      settled++;
    } else if (state === "Failed") {
      await failRefund(r.id, "reconcile: gateway FAILED");
      settled++;
    }
  }
  return { checked: stuck.length, settled };
}
