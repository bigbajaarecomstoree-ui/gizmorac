// Return eligibility for the entry transition ACTIVE → RETURN_REQUESTED
// (spec §3). Pure — no DB.

import type { OrderItemStatus } from "@prisma/client";

export interface ReturnEligibilityInput {
  itemStatus: OrderItemStatus;
  /** When the order was delivered (drives the return window). */
  deliveredAt: Date | null;
  returnWindowDays: number;
  /** Whether the product's category accepts returns. */
  returnableCategory: boolean;
  /** Flagged when the customer damaged the item (not returnable). */
  customerDamaged: boolean;
  now?: Date;
}

export interface Eligibility {
  ok: boolean;
  reason?: string;
}

export function canRequestReturn(i: ReturnEligibilityInput): Eligibility {
  if (i.itemStatus !== "ACTIVE") {
    return { ok: false, reason: "This item already has a return in progress or is closed." };
  }
  if (!i.returnableCategory) {
    return { ok: false, reason: "This product category isn't returnable." };
  }
  if (i.customerDamaged) {
    return { ok: false, reason: "Items damaged after delivery can't be returned." };
  }
  if (!i.deliveredAt) {
    return { ok: false, reason: "This order hasn't been delivered yet." };
  }
  const now = i.now ?? new Date();
  const deadline = new Date(i.deliveredAt.getTime() + i.returnWindowDays * 86_400_000);
  if (now > deadline) {
    return { ok: false, reason: "The return window has closed." };
  }
  return { ok: true };
}
