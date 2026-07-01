// Single source of truth for which order statuses count as realized revenue.
// Imported by every sales / revenue / profit / units aggregation so a new or
// renamed status can never silently leak into (or out of) the numbers the
// operator trusts. Previously this list was copy-pasted in five files, which is
// exactly how a status drifts between reports.
//
// NOTE on "Replacement": a Replacement-status order is the ORIGINAL paid sale
// whose status was flipped when a defective unit was re-shipped (see
// updateOrderStatus / startReplacement — no new order row is created). Its
// `total` is real, collected money, so it INTENTIONALLY stays counted as
// revenue. Excluding it would drop genuine sales from the top line. (The only
// real distortion around replacements — the second free unit's cost not being
// captured in COGS — is a separate finance concern, not a status-filter one.)

/** Statuses that are NOT realized revenue — excluded from all money/units stats. */
export const NON_REVENUE: string[] = ["Cancelled", "Returned", "Refunded"];

/** Prisma filter: `where: { status: REVENUE_STATUSES }` → realized-revenue orders only. */
export const REVENUE_STATUSES = { notIn: NON_REVENUE };

/** True when a status represents realized revenue (not cancelled/returned/refunded). */
export function isRevenue(status: string): boolean {
  return !NON_REVENUE.includes(status);
}
