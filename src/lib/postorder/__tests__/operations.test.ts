import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRiskLevel } from "../risk";
import { computeCreditNoteTax } from "../gst";

test("risk: levels by return rate / disputes / fraud score", () => {
  assert.equal(computeRiskLevel({ orderCount: 10, returnCount: 1, disputeCount: 0, fraudScore: 0 }).level, "NORMAL");
  assert.equal(computeRiskLevel({ orderCount: 4, returnCount: 2, disputeCount: 0, fraudScore: 0 }).level, "ELEVATED"); // 50%
  assert.equal(computeRiskLevel({ orderCount: 1, returnCount: 0, disputeCount: 2, fraudScore: 0 }).level, "ELEVATED");
  assert.equal(computeRiskLevel({ orderCount: 4, returnCount: 3, disputeCount: 0, fraudScore: 0 }).level, "STRICT_REVIEW"); // 75%
  assert.equal(computeRiskLevel({ orderCount: 1, returnCount: 0, disputeCount: 0, fraudScore: 80 }).level, "STRICT_REVIEW");
  assert.equal(computeRiskLevel({ orderCount: 0, returnCount: 0, disputeCount: 0, fraudScore: 0 }).returnRate, 0);
});

test("gst credit note: intrastate splits CGST+SGST and sums exactly", () => {
  const t = computeCreditNoteTax(159500, 18, false); // ₹1595 incl @18%
  assert.equal(t.igstPaise, 0);
  assert.equal(t.taxableValuePaise + t.cgstPaise + t.sgstPaise, 159500);
  assert.equal(t.cgstPaise + t.sgstPaise, 159500 - t.taxableValuePaise);
});

test("gst credit note: interstate is all IGST and sums exactly", () => {
  const t = computeCreditNoteTax(159500, 18, true);
  assert.equal(t.cgstPaise, 0);
  assert.equal(t.sgstPaise, 0);
  assert.equal(t.taxableValuePaise + t.igstPaise, 159500);
});
