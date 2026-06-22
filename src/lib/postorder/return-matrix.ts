// The ONE place return-reason policy lives (spec §2 matrix). Never hardcode
// investigation/shipping rules anywhere else.

import type { ReturnReason, OrderItemStatus } from "@prisma/client";

export interface ReturnPolicy {
  /** Investigation required before pickup? */
  investigation: boolean;
  /** Who pays return shipping. */
  shipping: "customer" | "merchant";
  /** QC always runs on receipt. */
  qc: true;
}

export const RETURN_MATRIX: Record<ReturnReason, ReturnPolicy> = {
  CHANGE_OF_MIND: { investigation: false, shipping: "customer", qc: true },
  SIZE_ISSUE: { investigation: false, shipping: "customer", qc: true },
  DEFECTIVE_PRODUCT: { investigation: true, shipping: "merchant", qc: true },
  DAMAGED_PRODUCT: { investigation: true, shipping: "merchant", qc: true },
  WRONG_ITEM_RECEIVED: { investigation: true, shipping: "merchant", qc: true },
  DELIVERY_DAMAGE: { investigation: true, shipping: "merchant", qc: true },
  MISSING_ACCESSORIES: { investigation: true, shipping: "merchant", qc: true },
  QUALITY_ISSUE: { investigation: true, shipping: "merchant", qc: true },
};

export function returnPolicy(reason: ReturnReason): ReturnPolicy {
  return RETURN_MATRIX[reason];
}

/**
 * First target after RETURN_REQUESTED, driven entirely by the matrix:
 * investigation reasons → UNDER_INVESTIGATION, others → PICKUP_SCHEDULED.
 */
export function entryTargetFor(reason: ReturnReason): OrderItemStatus {
  return RETURN_MATRIX[reason].investigation ? "UNDER_INVESTIGATION" : "PICKUP_SCHEDULED";
}
