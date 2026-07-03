// The ONE place return-reason policy lives (spec §2 matrix). Never hardcode
// investigation rules anywhere else.

import type { ReturnReason, OrderItemStatus } from "@prisma/client";

/** Reasons that require investigation before pickup. */
export const INVESTIGATION_REASONS: ReadonlySet<ReturnReason> = new Set([
  "DEFECTIVE_PRODUCT",
  "DAMAGED_PRODUCT",
  "WRONG_ITEM_RECEIVED",
  "DELIVERY_DAMAGE",
  "MISSING_ACCESSORIES",
  "QUALITY_ISSUE",
]);

/**
 * First target after RETURN_REQUESTED:
 * investigation reasons → UNDER_INVESTIGATION, others → PICKUP_SCHEDULED.
 */
export function entryTargetFor(reason: ReturnReason): OrderItemStatus {
  return INVESTIGATION_REASONS.has(reason) ? "UNDER_INVESTIGATION" : "PICKUP_SCHEDULED";
}
