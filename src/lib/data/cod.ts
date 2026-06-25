/** The COD-advance knobs (a subset of StoreSettings) — server settings satisfy
 *  this structurally, and the client can pass the same shape for a live preview. */
export interface CodAdvanceConfig {
  codAdvanceEnabled: boolean;
  codAdvanceType: string; // "FIXED" | "PERCENT"
  codAdvanceAmount: number;
  codAdvancePercent: number;
  codAdvanceMax: number;
  codAdvanceMin: number;
}

export interface CodAdvance {
  /** True when an advance > 0 applies to this order. */
  enabled: boolean;
  /** Whole rupees paid online now (the booking amount). */
  advance: number;
  /** Whole rupees collected on delivery = total − advance. */
  remaining: number;
}

/**
 * Server-authoritative COD booking advance. O(1), never trusts client input.
 * Invariants: 0 ≤ advance ≤ total; remaining = total − advance. Returns a zero
 * advance (standard COD) when the feature is off or the total is non-positive.
 */
export function computeCodAdvance(cfg: CodAdvanceConfig, orderTotal: number): CodAdvance {
  const total = Math.max(0, Math.round(orderTotal));
  if (!cfg.codAdvanceEnabled || total <= 0) {
    return { enabled: false, advance: 0, remaining: total };
  }

  let advance: number;
  if (cfg.codAdvanceType === "PERCENT") {
    advance = Math.round((total * cfg.codAdvancePercent) / 100);
    if (cfg.codAdvanceMax > 0) advance = Math.min(advance, cfg.codAdvanceMax);
  } else {
    advance = cfg.codAdvanceAmount;
  }
  if (cfg.codAdvanceMin > 0) advance = Math.max(advance, cfg.codAdvanceMin);

  // Final clamp guarantees the invariants regardless of admin configuration.
  advance = Math.min(Math.max(0, advance), total);
  return { enabled: advance > 0, advance, remaining: total - advance };
}
