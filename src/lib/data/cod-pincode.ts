import { prisma } from "@/lib/prisma";

export type CodPincodeMode = "STANDARD" | "HIGHER_CHARGE" | "PREPAID_ONLY" | "COD_DISABLED";
export const COD_PINCODE_MODES: CodPincodeMode[] = ["STANDARD", "HIGHER_CHARGE", "PREPAID_ONLY", "COD_DISABLED"];

export interface CodPincodeRule {
  id: string;
  pincode: string;
  mode: CodPincodeMode;
  advanceOverride: number | null;
  note: string;
}

function toRule(r: {
  id: string; pincode: string; mode: string; advanceOverride: number | null; note: string;
}): CodPincodeRule {
  return { id: r.id, pincode: r.pincode, mode: r.mode as CodPincodeMode, advanceOverride: r.advanceOverride, note: r.note };
}

/** The rule for one pincode, or null (no rule = global behaviour). */
export async function getCodPincodeRule(pincode: string): Promise<CodPincodeRule | null> {
  if (!/^\d{6}$/.test(pincode)) return null;
  const r = await prisma.codPincodeRule.findUnique({ where: { pincode } });
  return r ? toRule(r) : null;
}

export async function getCodPincodeRules(): Promise<CodPincodeRule[]> {
  const rows = await prisma.codPincodeRule.findMany({ orderBy: { pincode: "asc" }, take: 500 });
  return rows.map(toRule);
}

/** Whether COD may be offered for a pincode rule (null rule = allowed). */
export function codAllowedForRule(rule: CodPincodeRule | null): boolean {
  return !rule || (rule.mode !== "PREPAID_ONLY" && rule.mode !== "COD_DISABLED");
}
