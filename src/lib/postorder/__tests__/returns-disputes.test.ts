import { test } from "node:test";
import assert from "node:assert/strict";
import { canRequestReturn } from "../returns-policy";
import { canAppeal, allDisputeItemsResolved, isSlaBreached } from "../dispute-policy";
import { qcNextItemStatus, qcRestocksInventory } from "../qc";
import { applyDelta } from "../inventory-math";

const DAY = 86_400_000;
const base = {
  itemStatus: "ACTIVE" as const,
  deliveredAt: new Date("2026-06-20T00:00:00Z"),
  returnWindowDays: 7,
  returnableCategory: true,
  customerDamaged: false,
};

test("return eligibility: happy path within window", () => {
  assert.equal(canRequestReturn({ ...base, now: new Date("2026-06-22T00:00:00Z") }).ok, true);
});

test("return eligibility: blocked cases", () => {
  assert.equal(canRequestReturn({ ...base, itemStatus: "REFUNDED" }).ok, false);
  assert.equal(canRequestReturn({ ...base, returnableCategory: false }).ok, false);
  assert.equal(canRequestReturn({ ...base, customerDamaged: true }).ok, false);
  assert.equal(canRequestReturn({ ...base, deliveredAt: null }).ok, false);
  // past the window
  assert.equal(canRequestReturn({ ...base, now: new Date(base.deliveredAt.getTime() + 8 * DAY) }).ok, false);
  // exactly on the deadline is still allowed
  assert.equal(canRequestReturn({ ...base, now: new Date(base.deliveredAt.getTime() + 7 * DAY) }).ok, true);
});

test("dispute appeal cap (max 1)", () => {
  assert.equal(canAppeal({ status: "REJECTED", appealsUsed: 0, maxAppeals: 1 }), true);
  assert.equal(canAppeal({ status: "REJECTED", appealsUsed: 1, maxAppeals: 1 }), false);
  assert.equal(canAppeal({ status: "UNDER_INVESTIGATION", appealsUsed: 0, maxAppeals: 1 }), false);
});

test("dispute closure: all items resolved (mixed outcomes valid)", () => {
  assert.equal(allDisputeItemsResolved(["REFUNDED", "REPLACED", "REJECTED"]), true);
  assert.equal(allDisputeItemsResolved(["REFUNDED", null]), false);
  assert.equal(allDisputeItemsResolved(["REFUNDED", "ACTIVE"]), false);
  assert.equal(allDisputeItemsResolved([]), false);
});

test("dispute SLA breach", () => {
  const now = new Date("2026-06-22T12:00:00Z");
  assert.equal(isSlaBreached(new Date("2026-06-22T11:00:00Z"), now), true);
  assert.equal(isSlaBreached(new Date("2026-06-22T13:00:00Z"), now), false);
  assert.equal(isSlaBreached(null, now), false);
});

test("qc result → next item status", () => {
  assert.equal(qcNextItemStatus("PASSED", "refund"), "REFUND_APPROVED");
  assert.equal(qcNextItemStatus("PASSED", "replacement"), "REPLACEMENT_APPROVED");
  assert.equal(qcNextItemStatus("PARTIAL"), "REFUND_APPROVED");
  assert.equal(qcNextItemStatus("FAILED"), "REJECTED");
  assert.equal(qcRestocksInventory("PASSED"), true);
  assert.equal(qcRestocksInventory("PARTIAL"), true);
  assert.equal(qcRestocksInventory("FAILED"), false);
});

test("inventory: never goes negative", () => {
  assert.deepEqual(applyDelta(5, 1), { ok: true, stock: 6 });
  assert.deepEqual(applyDelta(5, -5), { ok: true, stock: 0 });
  const bad = applyDelta(0, -1);
  assert.equal(bad.ok, false);
  assert.equal(bad.stock, 0);
});
