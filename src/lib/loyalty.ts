// Gamified loyalty tiers, driven by the customer's delivered-order count.
// Pure (no DB) so both server and client can use it.

export interface LoyaltyTierInfo {
  name: string;
  emoji: string;
  min: number;
}

const TIERS: LoyaltyTierInfo[] = [
  { name: "Bronze", emoji: "🥉", min: 0 },
  { name: "Silver", emoji: "🥈", min: 5 },
  { name: "Gold", emoji: "🥇", min: 10 },
  { name: "Platinum", emoji: "💎", min: 20 },
];

export interface LoyaltyStatus {
  current: LoyaltyTierInfo;
  next: LoyaltyTierInfo | null;
  /** Progress through the current tier toward the next, 0–100. */
  pct: number;
  /** Delivered orders still needed to reach the next tier. */
  toNext: number;
}

export function loyaltyStatus(delivered: number): LoyaltyStatus {
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (delivered >= TIERS[i].min) {
      idx = i;
      break;
    }
  }
  const current = TIERS[idx];
  const next = TIERS[idx + 1] ?? null;
  const pct = next
    ? Math.max(0, Math.min(100, Math.round(((delivered - current.min) / (next.min - current.min)) * 100)))
    : 100;
  const toNext = next ? Math.max(0, next.min - delivered) : 0;
  return { current, next, pct, toNext };
}
