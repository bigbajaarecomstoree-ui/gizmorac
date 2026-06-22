// Post-order state machines — the single source of truth for valid transitions.
// Pure data + pure predicates (no DB, no side effects) so they are trivially
// testable. See docs/post-order-spec.md §3, §5, §7, §9, §13.

import type {
  OrderStatus,
  OrderItemStatus,
  DisputeStatus,
  RefundStatus,
} from "@prisma/client";

/** OrderItem flow (spec §3/§4). OrderItem is the operational source of truth. */
export const ITEM_TRANSITIONS: Record<OrderItemStatus, readonly OrderItemStatus[]> = {
  ACTIVE: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["UNDER_INVESTIGATION", "PICKUP_SCHEDULED", "REJECTED"],
  UNDER_INVESTIGATION: ["PICKUP_SCHEDULED", "REJECTED"],
  PICKUP_SCHEDULED: ["PICKED_UP"],
  PICKED_UP: ["QC_PENDING"],
  QC_PENDING: ["QC_PASSED", "QC_PARTIAL", "QC_FAILED"],
  QC_PASSED: ["REFUND_APPROVED", "REPLACEMENT_APPROVED"],
  QC_PARTIAL: ["REFUND_APPROVED"],
  QC_FAILED: ["REJECTED"],
  REFUND_APPROVED: ["REFUNDED"],
  REPLACEMENT_APPROVED: ["REPLACED"],
  REFUNDED: ["CLOSED"],
  REPLACED: ["CLOSED"],
  REJECTED: ["CLOSED"],
  CLOSED: [],
};

/** Dispute flow (spec §7). Appeal cap is enforced in the engine, not the table. */
export const DISPUTE_TRANSITIONS: Record<DisputeStatus, readonly DisputeStatus[]> = {
  NONE: ["RAISED"],
  RAISED: ["UNDER_INVESTIGATION"],
  UNDER_INVESTIGATION: ["ESCALATED", "REJECTED", "CLOSED"],
  ESCALATED: ["UNDER_INVESTIGATION"],
  REJECTED: ["APPEALED", "CLOSED"],
  APPEALED: ["UNDER_INVESTIGATION"],
  CLOSED: [],
};

/** Refund flow (spec §9). Retry/MANUAL_REVIEW counts enforced in the engine. */
export const REFUND_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  NOT_APPLICABLE: [],
  PENDING: ["PROCESSING", "NOT_APPLICABLE"],
  PROCESSING: ["REFUNDED", "PARTIALLY_REFUNDED", "FAILED"],
  PARTIALLY_REFUNDED: ["PROCESSING", "REFUNDED"],
  FAILED: ["PROCESSING", "MANUAL_REVIEW"],
  MANUAL_REVIEW: ["PROCESSING", "REFUNDED", "FAILED"],
  REFUNDED: [],
};

/** Order fulfilment + override events (spec §4/§5). Most order moves are derived;
 *  CANCELLED/RTO are explicit overrides. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RTO"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RTO"],
  DELIVERED: ["PARTIALLY_RETURNED", "RETURNED", "CLOSED"],
  PARTIALLY_RETURNED: ["RETURNED", "CLOSED"],
  RETURNED: ["CLOSED"],
  RTO: ["RETURNED", "CLOSED"],
  CANCELLED: [], // terminal (spec §13)
  CLOSED: [], // terminal
};

export type EntityKind = "order" | "item" | "dispute" | "refund";

const TABLES = {
  order: ORDER_TRANSITIONS,
  item: ITEM_TRANSITIONS,
  dispute: DISPUTE_TRANSITIONS,
  refund: REFUND_TRANSITIONS,
} as const;

/** Terminal states per entity (spec §13). Terminal entities cannot reopen. */
export const TERMINAL: Record<EntityKind, ReadonlySet<string>> = {
  order: new Set<OrderStatus>(["CANCELLED", "CLOSED"]),
  item: new Set<OrderItemStatus>(["CLOSED"]),
  dispute: new Set<DisputeStatus>(["CLOSED"]),
  refund: new Set<RefundStatus>(["REFUNDED", "NOT_APPLICABLE"]),
};

/** Item states that count as a terminal resolution (spec §18 Resolved vs Closed). */
export const RESOLVED_ITEM: ReadonlySet<OrderItemStatus> = new Set([
  "REFUNDED",
  "REPLACED",
  "REJECTED",
  "CLOSED",
]);

/** True when `to` is a declared valid successor of `from` for this entity. */
export function isValidTransition(kind: EntityKind, from: string, to: string): boolean {
  const allowed = (TABLES[kind] as Record<string, readonly string[]>)[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function isTerminal(kind: EntityKind, state: string): boolean {
  return TERMINAL[kind].has(state);
}

/** CANCELLED/RTO freeze any non-terminal item straight to CLOSED (spec §5). */
export function canForceCloseItem(from: OrderItemStatus): boolean {
  return from !== "CLOSED";
}
