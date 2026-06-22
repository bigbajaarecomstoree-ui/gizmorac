import { test } from "node:test";
import assert from "node:assert/strict";
import { decideRefundWebhook, isRefundDowngrade } from "../webhook-rules";

test("webhook idempotency: duplicate event_id is never applied", () => {
  const d = decideRefundWebhook({ duplicate: true, current: "PROCESSING", incoming: "REFUNDED" });
  assert.equal(d.apply, false);
  assert.match(d.reason, /duplicate/);
});

test("webhook: no-op when incoming equals current", () => {
  assert.equal(decideRefundWebhook({ duplicate: false, current: "REFUNDED", incoming: "REFUNDED" }).apply, false);
});

test("webhook: forward progress is applied", () => {
  assert.equal(decideRefundWebhook({ duplicate: false, current: "PENDING", incoming: "PROCESSING" }).apply, true);
  assert.equal(decideRefundWebhook({ duplicate: false, current: "PROCESSING", incoming: "REFUNDED" }).apply, true);
  assert.equal(decideRefundWebhook({ duplicate: false, current: "PARTIALLY_REFUNDED", incoming: "REFUNDED" }).apply, true);
});

test("webhook never downgrades: REFUNDED stays REFUNDED on a late event", () => {
  assert.equal(decideRefundWebhook({ duplicate: false, current: "REFUNDED", incoming: "PROCESSING" }).apply, false);
  assert.equal(decideRefundWebhook({ duplicate: false, current: "REFUNDED", incoming: "PENDING" }).apply, false);
  assert.equal(decideRefundWebhook({ duplicate: false, current: "REFUNDED", incoming: "PARTIALLY_REFUNDED" }).apply, false);
  assert.ok(isRefundDowngrade("REFUNDED", "PROCESSING"));
  assert.equal(isRefundDowngrade("PROCESSING", "REFUNDED"), false);
});

test("webhook out-of-order: sideways retry moves are allowed (same rank)", () => {
  // gateway may legitimately go PROCESSING → FAILED, then a retry FAILED → PROCESSING
  assert.equal(decideRefundWebhook({ duplicate: false, current: "PROCESSING", incoming: "FAILED" }).apply, true);
  assert.equal(decideRefundWebhook({ duplicate: false, current: "FAILED", incoming: "PROCESSING" }).apply, true);
  // but PENDING arriving after PROCESSING is stale (downgrade)
  assert.equal(decideRefundWebhook({ duplicate: false, current: "PROCESSING", incoming: "PENDING" }).apply, false);
});
