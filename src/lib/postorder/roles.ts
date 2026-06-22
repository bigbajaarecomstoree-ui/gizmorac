// Role enforcement for transitions (spec §19). Gated by ffRbac: while OFF, the
// single admin holds all operational roles (approved 2026-06-22), so every
// transition is permitted. While ON, the role matrix below is enforced.

export type Role =
  | "CUSTOMER"
  | "SUPPORT"
  | "OPERATIONS"
  | "QC"
  | "FINANCE"
  | "MANAGER"
  | "SYSTEM"
  | "ADMIN"; // OWNER superuser — satisfies any role

/** `${from}->${to}` → required role (spec §19). Unlisted transitions default to ADMIN-or-system. */
export const ITEM_TRANSITION_ROLES: Record<string, Role> = {
  "RETURN_REQUESTED->UNDER_INVESTIGATION": "SUPPORT",
  "RETURN_REQUESTED->PICKUP_SCHEDULED": "SUPPORT", // no-investigation path / auto-approve in window
  "UNDER_INVESTIGATION->PICKUP_SCHEDULED": "OPERATIONS",
  "PICKUP_SCHEDULED->PICKED_UP": "OPERATIONS",
  "PICKED_UP->QC_PENDING": "OPERATIONS",
  "QC_PENDING->QC_PASSED": "QC",
  "QC_PENDING->QC_PARTIAL": "QC",
  "QC_PENDING->QC_FAILED": "QC",
  "QC_PASSED->REFUND_APPROVED": "FINANCE",
  "QC_PARTIAL->REFUND_APPROVED": "FINANCE",
  "QC_PASSED->REPLACEMENT_APPROVED": "OPERATIONS",
  "REFUND_APPROVED->REFUNDED": "SYSTEM", // gateway/webhook only
};

export const DISPUTE_TRANSITION_ROLES: Record<string, Role> = {
  "RAISED->UNDER_INVESTIGATION": "SUPPORT",
  "UNDER_INVESTIGATION->ESCALATED": "SUPPORT",
  "UNDER_INVESTIGATION->REJECTED": "MANAGER",
  "REJECTED->APPEALED": "CUSTOMER",
  "APPEALED->UNDER_INVESTIGATION": "MANAGER",
};

export const REFUND_TRANSITION_ROLES: Record<string, Role> = {
  "PENDING->PROCESSING": "FINANCE",
  "PROCESSING->REFUNDED": "SYSTEM",
  "PROCESSING->FAILED": "SYSTEM",
  "FAILED->PROCESSING": "FINANCE",
  "FAILED->MANUAL_REVIEW": "SYSTEM",
};

export interface RoleFlags {
  /** ffRbac — when false, all roles are collapsed into the single admin. */
  rbac: boolean;
}

/** Operational roles a MANAGER is senior to (can act on their behalf). */
const MANAGER_COVERS: ReadonlySet<Role> = new Set(["SUPPORT", "OPERATIONS", "QC", "FINANCE", "MANAGER"]);

/** Does `actor` satisfy the `required` role for a transition? */
export function actorSatisfies(required: Role, actor: Role, flags: RoleFlags): boolean {
  if (!flags.rbac) return true; // single admin holds all roles
  if (actor === "ADMIN") return true; // OWNER superuser
  // MANAGER is senior to the operational roles (but not SYSTEM — gateway only).
  if (actor === "MANAGER" && MANAGER_COVERS.has(required)) return true;
  return actor === required;
}

export interface MakerCheckerInput {
  /** ffMakerChecker — dual approval for high-value refunds. */
  makerChecker: boolean;
  amountPaise: number;
  highValueThresholdPaise: number;
  approverRole: Role;
  /** Who entered the payout/bank details vs who is approving. */
  makerId?: string;
  checkerId?: string;
}

/**
 * Maker-checker for refund approval (spec §19): above the high-value threshold,
 * a MANAGER must approve and the approver must differ from the maker. No-op
 * while ffMakerChecker is off.
 */
export function checkMakerChecker(i: MakerCheckerInput): { ok: boolean; error?: string } {
  if (!i.makerChecker) return { ok: true };
  if (i.amountPaise < i.highValueThresholdPaise) return { ok: true };
  if (i.approverRole !== "MANAGER" && i.approverRole !== "ADMIN") {
    return { ok: false, error: "High-value refund requires manager approval." };
  }
  if (i.makerId && i.checkerId && i.makerId === i.checkerId) {
    return { ok: false, error: "Maker-checker: the approver must differ from the requester." };
  }
  return { ok: true };
}
