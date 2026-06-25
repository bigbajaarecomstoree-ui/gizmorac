// Pure order-action policy — no server deps, safe to import anywhere
// (server pages, server actions). The matching UI just receives booleans.

/** A customer can cancel only before the parcel is handed to the courier. */
export function canCancelOrder(status: string): boolean {
  return status === "Pending" || status === "Confirmed" || status === "Packed";
}

// Self-cancellation also closes at the end of the IST calendar day the order was
// placed on (23:59 IST) — so an early order gets more time, a late one less, and
// the window can never run open-ended. India Standard Time is a fixed UTC+5:30
// (no DST), so a constant offset is exact and avoids any server-timezone drift.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The instant self-cancellation closes: the next IST midnight after the order. */
export function cancelDeadline(createdAt: string | Date): Date {
  const created = new Date(createdAt);
  // Shift into IST wall-clock to read the order's calendar date…
  const ist = new Date(created.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  // …then take 00:00 IST of the following day (= 23:59:59.999 IST that day + 1ms).
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0) - IST_OFFSET_MS);
}

/** True while the order is still within its same-day (IST) cancellation window. */
export function cancelWindowOpen(createdAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() < cancelDeadline(createdAt).getTime();
}

/**
 * Customer self-cancel gate: allowed only before dispatch AND within the
 * same-day (IST) window — whichever closes first. Admin cancellation is not
 * subject to the timer and keeps using `canCancelOrder` (status only).
 */
export function canCustomerCancel(
  status: string,
  createdAt: string | Date,
  now: Date = new Date(),
): boolean {
  return canCancelOrder(status) && cancelWindowOpen(createdAt, now);
}

/** Human label for when the window closes, e.g. "11:59 PM, 25 Jun" (IST). */
export function cancelDeadlineLabel(createdAt: string | Date): string {
  // One minute before the next IST midnight = 23:59 IST of the order day.
  const close = new Date(cancelDeadline(createdAt).getTime() - 60 * 1000);
  return close.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "short",
  });
}

export const DISPUTE_WINDOW_HOURS = 48;
const DISPUTE_WINDOW_MS = DISPUTE_WINDOW_HOURS * 60 * 60 * 1000;

/** A dispute can be raised only while delivered and within 48h of delivery. */
export function isDisputeWindowOpen(
  status: string,
  deliveredAt: string | Date | null | undefined,
  fallback?: string | Date | null,
): boolean {
  if (status !== "Delivered") return false;
  const ref = deliveredAt ?? fallback;
  // Delivered but no timestamp (legacy order) — don't lock the customer out.
  if (!ref) return true;
  return Date.now() - new Date(ref).getTime() <= DISPUTE_WINDOW_MS;
}

/**
 * A warranty claim is allowed only while the order is delivered AND still
 * within the product's warranty window. `warrantyMonths <= 0` means the product
 * carries no warranty, so the button stays hidden entirely (never shown without
 * warranty — avoids confusing buyers).
 */
export function warrantyClaimOpen(
  status: string,
  deliveredAt: string | Date | null | undefined,
  warrantyMonths: number,
  fallback?: string | Date | null,
): boolean {
  if (status !== "Delivered") return false;
  if (!warrantyMonths || warrantyMonths <= 0) return false;
  const ref = deliveredAt ?? fallback;
  if (!ref) return true; // delivered, no timestamp (legacy) — allow within warranty
  const end = new Date(ref);
  end.setMonth(end.getMonth() + warrantyMonths);
  return Date.now() <= end.getTime();
}
