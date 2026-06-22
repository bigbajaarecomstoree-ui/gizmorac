import { test } from "node:test";
import assert from "node:assert/strict";
import { rupeesToPaise, paiseToRupees, prorate } from "../money";
import { wouldExceedCeiling, sumCountedRefunds, refundableRemaining } from "../refund-math";
import type { RefundStatus } from "@prisma/client";

const r = (status: RefundStatus, amountPaise: number) => ({ status, amountPaise });

test("money: rupee↔paise conversions", () => {
  assert.equal(rupeesToPaise(1595), 159500);
  assert.equal(rupeesToPaise(0), 0);
  assert.equal(paiseToRupees(159500), 1595);
});

test("money: prorate sums back to exactly the total", () => {
  const parts = prorate(159500, [1000, 500]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 159500);
  const three = prorate(100, [1, 1, 1]);
  assert.equal(three.reduce((a, b) => a + b, 0), 100); // remainder absorbed
  assert.deepEqual(prorate(0, [1, 1]), [0, 0]);
  assert.deepEqual(prorate(500, [0, 0]), [0, 0]); // zero weights
});

test("over-refund: only completed/processing/partial consume the ceiling", () => {
  assert.equal(sumCountedRefunds([r("REFUNDED", 100), r("PROCESSING", 50), r("PARTIALLY_REFUNDED", 25)]), 175);
  assert.equal(sumCountedRefunds([r("FAILED", 999), r("PENDING", 999), r("MANUAL_REVIEW", 999)]), 0);
});

test("over-refund: invariant SUM(counted)+new ≤ amountPaid", () => {
  const paid = 159500;
  // full refund, nothing prior → ok
  assert.equal(wouldExceedCeiling(paid, [], 159500), false);
  // exact second rupee over → blocked
  assert.equal(wouldExceedCeiling(paid, [r("REFUNDED", 159500)], 1), true);
  // processing counts toward ceiling
  assert.equal(wouldExceedCeiling(paid, [r("PROCESSING", 100000)], 60000), true); // 160000 > 159500
  assert.equal(wouldExceedCeiling(paid, [r("PROCESSING", 100000)], 59500), false); // exactly 159500
  // a prior FAILED refund does NOT consume the ceiling → full refund still allowed
  assert.equal(wouldExceedCeiling(paid, [r("FAILED", 159500)], 159500), false);
  // non-positive amounts are always rejected
  assert.equal(wouldExceedCeiling(paid, [], 0), true);
  assert.equal(wouldExceedCeiling(paid, [], -100), true);
});

test("over-refund: partial refunds accumulate to the ceiling", () => {
  const paid = 159500;
  assert.equal(wouldExceedCeiling(paid, [r("PARTIALLY_REFUNDED", 50000)], 109500), false); // == paid
  assert.equal(wouldExceedCeiling(paid, [r("PARTIALLY_REFUNDED", 50000)], 110000), true); // over
  assert.equal(refundableRemaining(paid, [r("PARTIALLY_REFUNDED", 50000)]), 109500);
  assert.equal(refundableRemaining(paid, [r("REFUNDED", 159500)]), 0);
});
