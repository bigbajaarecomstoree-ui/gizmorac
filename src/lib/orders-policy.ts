// Pure order-action policy — no server deps, safe to import anywhere
// (server pages, server actions). The matching UI just receives booleans.

/** A customer can cancel only before the parcel is handed to the courier. */
export function canCancelOrder(status: string): boolean {
  return status === "Pending" || status === "Confirmed" || status === "Packed";
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
