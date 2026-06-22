// Customer risk scoring (spec §12). Pure — no DB. Effect is gated by
// ffFraudScoring at the service layer; this computes the signal regardless.

export interface RiskInput {
  orderCount: number;
  returnCount: number;
  disputeCount: number;
  fraudScore: number; // 0–100, maintained externally
}

export type RiskLevel = "NORMAL" | "ELEVATED" | "STRICT_REVIEW";

export interface RiskOutput {
  returnRate: number; // 0–1, rounded to 2dp
  level: RiskLevel;
}

export function computeRiskLevel(i: RiskInput): RiskOutput {
  const returnRate = i.orderCount > 0 ? i.returnCount / i.orderCount : 0;

  let level: RiskLevel = "NORMAL";
  // Elevated: frequent returns once there's a track record, or repeated disputes.
  if ((i.orderCount >= 3 && returnRate >= 0.5) || i.disputeCount >= 2) level = "ELEVATED";
  // Strict review: high fraud score, egregious return abuse, or many disputes.
  if (i.fraudScore >= 70 || (i.orderCount >= 4 && returnRate >= 0.75) || i.disputeCount >= 4) {
    level = "STRICT_REVIEW";
  }

  return { returnRate: Math.round(returnRate * 100) / 100, level };
}
