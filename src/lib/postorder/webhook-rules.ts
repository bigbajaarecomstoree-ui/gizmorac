// Webhook safety rules (spec §11): deduplicate, ignore stale/out-of-order, and
// NEVER downgrade a status (e.g. never move REFUNDED back to PROCESSING on a
// late event). Pure — no DB.

import type { RefundStatus } from "@prisma/client";

/**
 * Monotonic rank for refund states. A webhook may never move to a strictly
 * lower rank. In-flight states (PROCESSING/FAILED/MANUAL_REVIEW) share rank 2
 * so legitimate sideways moves (PROCESSING↔FAILED retry) are still allowed.
 */
export const REFUND_RANK: Record<RefundStatus, number> = {
  NOT_APPLICABLE: 0,
  PENDING: 1,
  PROCESSING: 2,
  FAILED: 2,
  MANUAL_REVIEW: 2,
  PARTIALLY_REFUNDED: 3,
  REFUNDED: 4,
};

export function isRefundDowngrade(current: RefundStatus, incoming: RefundStatus): boolean {
  return REFUND_RANK[incoming] < REFUND_RANK[current];
}

export interface WebhookDecisionInput {
  /** event_id already seen (idempotency). */
  duplicate: boolean;
  current: RefundStatus;
  incoming: RefundStatus;
}

export interface WebhookDecision {
  apply: boolean;
  reason: string;
}

/**
 * Decide whether a refund webhook should mutate state: drop duplicates and
 * no-ops, reject downgrades (stale/out-of-order), otherwise apply.
 */
export function decideRefundWebhook(i: WebhookDecisionInput): WebhookDecision {
  if (i.duplicate) return { apply: false, reason: "duplicate event_id" };
  if (i.incoming === i.current) return { apply: false, reason: "no-op (same state)" };
  if (isRefundDowngrade(i.current, i.incoming)) {
    return { apply: false, reason: "stale/out-of-order: would downgrade status" };
  }
  return { apply: true, reason: "apply" };
}
