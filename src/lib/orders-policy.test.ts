import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cancelDeadline,
  cancelWindowOpen,
  canCustomerCancel,
  cancelDeadlineLabel,
} from "./orders-policy";

// IST = UTC+5:30. Helper: build a UTC instant for a given IST wall-clock time.
const IST = (y: number, mo: number, d: number, h: number, mi = 0) =>
  new Date(Date.UTC(y, mo, d, h, mi) - 5.5 * 60 * 60 * 1000);

test("deadline is the next IST midnight after the order day", () => {
  // 25 Jun 2026, 1:00 PM IST  ->  deadline 26 Jun 2026, 00:00 IST.
  const created = IST(2026, 5, 25, 13);
  assert.equal(cancelDeadline(created).getTime(), IST(2026, 5, 26, 0).getTime());
});

test("early order gets more time, late order less — same cutoff", () => {
  const early = IST(2026, 5, 25, 13); // 1 PM
  const late = IST(2026, 5, 25, 22); // 10 PM
  // Same closing instant for both.
  assert.equal(cancelDeadline(early).getTime(), cancelDeadline(late).getTime());
  // At 11 PM IST both are still open…
  const elevenPm = IST(2026, 5, 25, 23);
  assert.equal(cancelWindowOpen(early, elevenPm), true);
  assert.equal(cancelWindowOpen(late, elevenPm), true);
  // …and just after midnight IST both are closed.
  const afterMidnight = IST(2026, 5, 26, 0, 5);
  assert.equal(cancelWindowOpen(early, afterMidnight), false);
  assert.equal(cancelWindowOpen(late, afterMidnight), false);
});

test("window is open right up to 11:59 PM and closed at midnight", () => {
  const created = IST(2026, 5, 25, 10);
  assert.equal(cancelWindowOpen(created, IST(2026, 5, 25, 23, 59)), true);
  assert.equal(cancelWindowOpen(created, IST(2026, 5, 26, 0, 0)), false);
});

test("canCustomerCancel needs BOTH pre-dispatch status AND open window", () => {
  const created = IST(2026, 5, 25, 13);
  const open = IST(2026, 5, 25, 20);
  const closed = IST(2026, 5, 26, 1);
  assert.equal(canCustomerCancel("Pending", created, open), true);
  assert.equal(canCustomerCancel("Confirmed", created, open), true);
  assert.equal(canCustomerCancel("Packed", created, open), true);
  // Dispatched: blocked even while the window is open.
  assert.equal(canCustomerCancel("Shipped", created, open), false);
  assert.equal(canCustomerCancel("Delivered", created, open), false);
  // Window closed: blocked even while still pre-dispatch.
  assert.equal(canCustomerCancel("Pending", created, closed), false);
});

test("deadline label shows 11:59 PM of the order's IST day", () => {
  const label = cancelDeadlineLabel(IST(2026, 5, 25, 13));
  assert.match(label, /11:59/);
  assert.match(label, /25 Jun/);
});
