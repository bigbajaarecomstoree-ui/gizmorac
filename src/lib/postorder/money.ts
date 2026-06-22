// Money is integer paise everywhere (spec §8). Pure helpers — no DB.

/** Whole-rupee Int → paise. Existing money is whole rupees, so ×100 is exact. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees) * 100;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Split `totalPaise` across `weights` (e.g. per-item line subtotals) so the
 * parts sum back to exactly `totalPaise`. The largest-weight bucket absorbs the
 * rounding remainder. Used to prorate order discount/shipping across items
 * before any partial refund (spec §8).
 */
export function prorate(totalPaise: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);

  const parts = weights.map((w) => Math.floor((totalPaise * w) / sum));
  const allocated = parts.reduce((a, b) => a + b, 0);
  let remainder = totalPaise - allocated;

  // Hand the remainder to the largest-weight bucket (stable, deterministic).
  let idx = 0;
  for (let i = 1; i < weights.length; i++) if (weights[i] > weights[idx]) idx = i;
  parts[idx] += remainder;
  remainder = 0;
  return parts;
}
