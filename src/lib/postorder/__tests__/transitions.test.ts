import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidTransition, isTerminal, canForceCloseItem } from "../state-machines";
import { validateTransition } from "../validate";

const RBAC_OFF = { rbac: false, makerChecker: false };
const RBAC_ON = { rbac: true, makerChecker: false };

test("item: valid forward transitions are allowed", () => {
  assert.ok(isValidTransition("item", "ACTIVE", "RETURN_REQUESTED"));
  assert.ok(isValidTransition("item", "RETURN_REQUESTED", "UNDER_INVESTIGATION"));
  assert.ok(isValidTransition("item", "RETURN_REQUESTED", "PICKUP_SCHEDULED"));
  assert.ok(isValidTransition("item", "PICKED_UP", "QC_PENDING"));
  for (const to of ["QC_PASSED", "QC_PARTIAL", "QC_FAILED"]) {
    assert.ok(isValidTransition("item", "QC_PENDING", to));
  }
  assert.ok(isValidTransition("item", "QC_PASSED", "REFUND_APPROVED"));
  assert.ok(isValidTransition("item", "QC_PASSED", "REPLACEMENT_APPROVED"));
  assert.ok(isValidTransition("item", "REFUND_APPROVED", "REFUNDED"));
  assert.ok(isValidTransition("item", "REFUNDED", "CLOSED"));
});

test("item: invalid jumps are blocked", () => {
  assert.equal(isValidTransition("item", "ACTIVE", "REFUNDED"), false);
  assert.equal(isValidTransition("item", "ACTIVE", "QC_PASSED"), false);
  assert.equal(isValidTransition("item", "REFUND_APPROVED", "CLOSED"), false); // must REFUND first
  assert.equal(isValidTransition("item", "QC_FAILED", "REFUND_APPROVED"), false);
});

test("terminal states never reopen", () => {
  assert.ok(isTerminal("item", "CLOSED"));
  assert.ok(isTerminal("order", "CANCELLED"));
  assert.ok(isTerminal("order", "CLOSED"));
  assert.ok(isTerminal("dispute", "CLOSED"));
  assert.ok(isTerminal("refund", "REFUNDED"));
  assert.equal(isValidTransition("item", "CLOSED", "ACTIVE"), false);
});

test("refund: never downgrade REFUNDED; retry path valid", () => {
  assert.ok(isValidTransition("refund", "PENDING", "PROCESSING"));
  assert.ok(isValidTransition("refund", "PROCESSING", "REFUNDED"));
  assert.ok(isValidTransition("refund", "PROCESSING", "FAILED"));
  assert.ok(isValidTransition("refund", "FAILED", "PROCESSING")); // retry
  assert.ok(isValidTransition("refund", "FAILED", "MANUAL_REVIEW"));
  assert.equal(isValidTransition("refund", "REFUNDED", "PROCESSING"), false); // no downgrade
});

test("dispute: investigation, escalation, appeal", () => {
  assert.ok(isValidTransition("dispute", "RAISED", "UNDER_INVESTIGATION"));
  assert.ok(isValidTransition("dispute", "UNDER_INVESTIGATION", "ESCALATED"));
  assert.ok(isValidTransition("dispute", "ESCALATED", "UNDER_INVESTIGATION"));
  assert.ok(isValidTransition("dispute", "REJECTED", "APPEALED"));
  assert.ok(isValidTransition("dispute", "REJECTED", "CLOSED"));
});

test("validateTransition: no-op is ok; terminal & invalid blocked", () => {
  assert.ok(validateTransition({ kind: "item", from: "ACTIVE", to: "ACTIVE", actorRole: "ADMIN", flags: RBAC_OFF }).ok);
  assert.equal(validateTransition({ kind: "item", from: "CLOSED", to: "ACTIVE", actorRole: "ADMIN", flags: RBAC_OFF }).ok, false);
  assert.equal(validateTransition({ kind: "item", from: "ACTIVE", to: "REFUNDED", actorRole: "ADMIN", flags: RBAC_OFF }).ok, false);
});

test("validateTransition: override freeze closes an active item on cancel/RTO", () => {
  assert.ok(validateTransition({ kind: "item", from: "PICKED_UP", to: "CLOSED", actorRole: "SYSTEM", flags: RBAC_OFF, override: true }).ok);
  // without override, jumping to CLOSED is invalid
  assert.equal(validateTransition({ kind: "item", from: "PICKED_UP", to: "CLOSED", actorRole: "SYSTEM", flags: RBAC_OFF }).ok, false);
  assert.ok(canForceCloseItem("PICKED_UP"));
  assert.equal(canForceCloseItem("CLOSED"), false);
});

test("validateTransition: roles enforced only when ffRbac is on", () => {
  // RBAC off → single admin holds all roles
  assert.ok(validateTransition({ kind: "item", from: "QC_PENDING", to: "QC_PASSED", actorRole: "SUPPORT", flags: RBAC_OFF }).ok);
  // RBAC on → QC decision needs QC (or ADMIN)
  assert.equal(validateTransition({ kind: "item", from: "QC_PENDING", to: "QC_PASSED", actorRole: "SUPPORT", flags: RBAC_ON }).ok, false);
  assert.ok(validateTransition({ kind: "item", from: "QC_PENDING", to: "QC_PASSED", actorRole: "QC", flags: RBAC_ON }).ok);
  assert.ok(validateTransition({ kind: "item", from: "QC_PENDING", to: "QC_PASSED", actorRole: "ADMIN", flags: RBAC_ON }).ok);
});

test("validateTransition: maker-checker on high-value refund approval", () => {
  const base = { kind: "item" as const, from: "QC_PASSED", to: "REFUND_APPROVED", highValueThresholdPaise: 500000 };
  // below threshold → fine even for FINANCE with maker-checker on
  assert.ok(validateTransition({ ...base, actorRole: "FINANCE", flags: { rbac: true, makerChecker: true }, amountPaise: 100000 }).ok);
  // high value, FINANCE → blocked (needs manager)
  assert.equal(validateTransition({ ...base, actorRole: "FINANCE", flags: { rbac: true, makerChecker: true }, amountPaise: 900000 }).ok, false);
  // high value, MANAGER, different maker/checker → ok
  assert.ok(validateTransition({ ...base, actorRole: "MANAGER", flags: { rbac: true, makerChecker: true }, amountPaise: 900000, makerId: "u1", checkerId: "u2" }).ok);
  // high value, MANAGER but same person made & checked → blocked
  assert.equal(validateTransition({ ...base, actorRole: "MANAGER", flags: { rbac: true, makerChecker: true }, amountPaise: 900000, makerId: "u1", checkerId: "u1" }).ok, false);
});
