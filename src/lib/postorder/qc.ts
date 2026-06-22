// QC outcome → next item status (spec §3/§7). Pure — no DB.

import type { QcResult, OrderItemStatus } from "@prisma/client";

export type QcResolution = "refund" | "replacement";

/**
 * Map a QC result to the item's next status:
 *   PASSED  → REFUND_APPROVED (full) or REPLACEMENT_APPROVED
 *   PARTIAL → REFUND_APPROVED (minus restocking deduction)
 *   FAILED  → REJECTED (returned to customer / not resaleable)
 *   PENDING → no change
 */
export function qcNextItemStatus(result: QcResult, resolution: QcResolution = "refund"): OrderItemStatus {
  switch (result) {
    case "PASSED":
      return resolution === "replacement" ? "REPLACEMENT_APPROVED" : "REFUND_APPROVED";
    case "PARTIAL":
      return "REFUND_APPROVED";
    case "FAILED":
      return "REJECTED";
    case "PENDING":
    default:
      return "QC_PENDING";
  }
}

/** Whether a QC result returns the unit to sellable stock (PASSED/PARTIAL) vs damaged (FAILED). */
export function qcRestocksInventory(result: QcResult): boolean {
  return result === "PASSED" || result === "PARTIAL";
}
