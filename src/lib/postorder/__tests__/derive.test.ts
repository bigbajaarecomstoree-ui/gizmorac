import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveOrderStatus } from "../derive-order-status";
import { entryTargetFor } from "../return-matrix";

test("derive: CANCELLED/RTO override wins over items", () => {
  assert.equal(deriveOrderStatus(["ACTIVE", "REFUNDED"], { override: "CANCELLED" }), "CANCELLED");
  assert.equal(deriveOrderStatus(["ACTIVE"], { override: "RTO" }), "RTO");
});

test("derive: all items CLOSED → CLOSED", () => {
  assert.equal(deriveOrderStatus(["CLOSED", "CLOSED"]), "CLOSED");
});

test("derive: all items resolved (not all closed) → RETURNED", () => {
  assert.equal(deriveOrderStatus(["REFUNDED", "REPLACED"]), "RETURNED");
  assert.equal(deriveOrderStatus(["REJECTED", "CLOSED"]), "RETURNED");
});

test("derive: some resolved + some active → PARTIALLY_RETURNED", () => {
  assert.equal(deriveOrderStatus(["REFUNDED", "ACTIVE"]), "PARTIALLY_RETURNED");
  assert.equal(deriveOrderStatus(["REJECTED", "ACTIVE", "ACTIVE"]), "PARTIALLY_RETURNED");
});

test("derive: none resolved → fulfilment status", () => {
  assert.equal(deriveOrderStatus(["ACTIVE", "ACTIVE"], { fulfillmentStatus: "DELIVERED" }), "DELIVERED");
  assert.equal(deriveOrderStatus(["ACTIVE"], { fulfillmentStatus: "SHIPPED" }), "SHIPPED");
  assert.equal(deriveOrderStatus([], { fulfillmentStatus: "PROCESSING" }), "PROCESSING");
});

test("derive: in-progress return (not yet resolved) with active siblings is not RETURNED", () => {
  // QC_PENDING is not a resolved state → with an ACTIVE sibling, still fulfilment
  assert.equal(deriveOrderStatus(["QC_PENDING", "ACTIVE"], { fulfillmentStatus: "DELIVERED" }), "DELIVERED");
});

test("return matrix: entry target driven by investigation flag", () => {
  assert.equal(entryTargetFor("CHANGE_OF_MIND"), "PICKUP_SCHEDULED");
  assert.equal(entryTargetFor("SIZE_ISSUE"), "PICKUP_SCHEDULED");
  assert.equal(entryTargetFor("DEFECTIVE_PRODUCT"), "UNDER_INVESTIGATION");
  assert.equal(entryTargetFor("QUALITY_ISSUE"), "UNDER_INVESTIGATION");
});
