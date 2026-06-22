// Order status is DERIVED from item statuses, except CANCELLED/RTO overrides
// (spec §5). Pure function — no DB.

import type { OrderStatus, OrderItemStatus } from "@prisma/client";
import { RESOLVED_ITEM } from "./state-machines";

export interface DeriveOptions {
  /** Order-level override event; wins over derivation. */
  override?: "CANCELLED" | "RTO";
  /** The order's current fulfilment stage when no items are resolved. */
  fulfillmentStatus?: OrderStatus;
}

/**
 * Priority: CANCELLED > RTO > derived(item statuses).
 *   all items CLOSED                  → CLOSED
 *   all items resolved                → RETURNED
 *   some resolved, some not           → PARTIALLY_RETURNED
 *   none resolved                     → fulfilment status
 */
export function deriveOrderStatus(
  itemStatuses: OrderItemStatus[],
  opts: DeriveOptions = {},
): OrderStatus {
  if (opts.override) return opts.override;

  const fulfillment = opts.fulfillmentStatus ?? "DELIVERED";
  const n = itemStatuses.length;
  if (n === 0) return fulfillment;

  const closed = itemStatuses.filter((s) => s === "CLOSED").length;
  const resolved = itemStatuses.filter((s) => RESOLVED_ITEM.has(s)).length;

  if (closed === n) return "CLOSED";
  if (resolved === n) return "RETURNED";
  if (resolved > 0) return "PARTIALLY_RETURNED";
  return fulfillment;
}
