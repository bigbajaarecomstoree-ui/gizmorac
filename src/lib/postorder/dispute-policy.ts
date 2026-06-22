// Dispute policy: appeal cap, SLA breach, closure (spec §7). Pure — no DB.

import type { DisputeStatus, OrderItemStatus } from "@prisma/client";

export interface AppealInput {
  status: DisputeStatus;
  appealsUsed: number;
  maxAppeals: number;
}

/** A dispute may be appealed only when REJECTED and the cap isn't reached. */
export function canAppeal(i: AppealInput): boolean {
  return i.status === "REJECTED" && i.appealsUsed < i.maxAppeals;
}

const DISPUTE_ITEM_RESOLVED: ReadonlySet<OrderItemStatus> = new Set([
  "REFUNDED",
  "REPLACED",
  "REJECTED",
  "CLOSED",
]);

/** A dispute closes when ALL its items reach a resolution (mixed outcomes valid). */
export function allDisputeItemsResolved(outcomes: (OrderItemStatus | null)[]): boolean {
  return outcomes.length > 0 && outcomes.every((o) => o != null && DISPUTE_ITEM_RESOLVED.has(o));
}

/** UNDER_INVESTIGATION held past its SLA escalates (spec §7). */
export function isSlaBreached(slaDueAt: Date | null, now: Date = new Date()): boolean {
  return slaDueAt != null && now > slaDueAt;
}
