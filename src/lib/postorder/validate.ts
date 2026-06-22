// Pure transition validation — the decision core the engine wraps. No DB.
// Composes: terminal guard → table validity → role permission → maker-checker.

import {
  isValidTransition,
  isTerminal,
  canForceCloseItem,
  type EntityKind,
} from "./state-machines";
import {
  actorSatisfies,
  checkMakerChecker,
  ITEM_TRANSITION_ROLES,
  DISPUTE_TRANSITION_ROLES,
  REFUND_TRANSITION_ROLES,
  type Role,
} from "./roles";

const ROLE_TABLES: Record<EntityKind, Record<string, Role>> = {
  order: {},
  item: ITEM_TRANSITION_ROLES,
  dispute: DISPUTE_TRANSITION_ROLES,
  refund: REFUND_TRANSITION_ROLES,
};

export interface ValidateInput {
  kind: EntityKind;
  from: string;
  to: string;
  actorRole: Role;
  flags: { rbac: boolean; makerChecker: boolean };
  /** CANCELLED/RTO freeze: permits item → CLOSED from any non-terminal state. */
  override?: boolean;
  /** Refund-approval amount for maker-checker (paise). */
  amountPaise?: number;
  highValueThresholdPaise?: number;
  makerId?: string;
  checkerId?: string;
}

export interface ValidateResult {
  ok: boolean;
  error?: string;
}

export function validateTransition(i: ValidateInput): ValidateResult {
  // No-op transition is a safe success (idempotent re-derivation).
  if (i.from === i.to) return { ok: true };

  // Terminal states never reopen (spec §13), except the legitimate
  // resolved→CLOSED move which the table allows explicitly.
  if (isTerminal(i.kind, i.from)) {
    return { ok: false, error: `${i.from} is terminal and cannot transition.` };
  }

  // Override freeze: cancel/RTO sends an item straight to CLOSED.
  if (i.override && i.kind === "item" && i.to === "CLOSED") {
    return canForceCloseItem(i.from as never)
      ? { ok: true }
      : { ok: false, error: "Item already closed." };
  }

  // Table validity.
  if (!isValidTransition(i.kind, i.from, i.to)) {
    return { ok: false, error: `Invalid transition ${i.from} → ${i.to}.` };
  }

  // Role permission.
  const required = ROLE_TABLES[i.kind][`${i.from}->${i.to}`];
  if (required && !actorSatisfies(required, i.actorRole, i.flags)) {
    return { ok: false, error: `Role ${i.actorRole} cannot perform ${i.from} → ${i.to} (needs ${required}).` };
  }

  // Maker-checker on refund approval (spec §19).
  const isRefundApproval =
    (i.kind === "item" && i.to === "REFUND_APPROVED") ||
    (i.kind === "refund" && i.to === "PROCESSING");
  if (isRefundApproval) {
    const mc = checkMakerChecker({
      makerChecker: i.flags.makerChecker,
      amountPaise: i.amountPaise ?? 0,
      highValueThresholdPaise: i.highValueThresholdPaise ?? Number.MAX_SAFE_INTEGER,
      approverRole: i.actorRole,
      makerId: i.makerId,
      checkerId: i.checkerId,
    });
    if (!mc.ok) return mc;
  }

  return { ok: true };
}
