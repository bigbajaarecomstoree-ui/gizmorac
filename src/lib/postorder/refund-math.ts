// Over-refund invariant (spec §8). Pure — no DB.
//   SUM(completed + processing + partial) + new  ≤  amount_paid

import type { RefundStatus } from "@prisma/client";

export interface RefundLike {
  status: RefundStatus;
  amountPaise: number;
}

/** States that consume the refund ceiling: completed, in-flight, and partial. */
export const COUNTED_REFUND_STATES: ReadonlySet<RefundStatus> = new Set([
  "REFUNDED",
  "PROCESSING",
  "PARTIALLY_REFUNDED",
]);

export function sumCountedRefunds(refunds: RefundLike[]): number {
  return refunds
    .filter((r) => COUNTED_REFUND_STATES.has(r.status))
    .reduce((sum, r) => sum + r.amountPaise, 0);
}

/**
 * True if adding `newRefundPaise` would breach the amount paid (hard invariant).
 * A non-positive refund is always rejected. FAILED/PENDING/NOT_APPLICABLE/
 * MANUAL_REVIEW refunds do NOT consume the ceiling.
 */
export function wouldExceedCeiling(
  amountPaidPaise: number,
  existing: RefundLike[],
  newRefundPaise: number,
): boolean {
  if (newRefundPaise <= 0) return true;
  return sumCountedRefunds(existing) + newRefundPaise > amountPaidPaise;
}
