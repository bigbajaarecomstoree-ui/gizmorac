// End-to-end validation of the v2 post-order flow against a staging clone.
// Drives the real services (engine + returns + qc + refund) on backfilled data:
//   ACTIVE → RETURN_REQUESTED → PICKUP_SCHEDULED → PICKED_UP → QC_PENDING
//   → (auto-QC PASSED) → REFUND_APPROVED → REFUNDED → CLOSED, order derives
//   RETURNED, inventory restocked, credit note issued, audit trail written.
//
//   DATABASE_URL=<staging> node --import tsx scripts/postorder-e2e.mjs
import { prisma } from "../src/lib/prisma.ts";
import { requestReturn, markPickedUp, receiveForQc } from "../src/lib/postorder/returns.ts";
import { applyRefundWebhook, createRefund } from "../src/lib/postorder/refund-engine.ts";
import { recomputeOrderStatus } from "../src/lib/postorder/transition-engine.ts";

const log = (...a) => console.log(...a);
const ADMIN = { role: "ADMIN", id: "admin", email: "admin@gizmorac" };
let failures = 0;
function check(label, cond) { log(`  ${cond ? "✅" : "❌"} ${label}`); if (!cond) failures++; }

(async () => {
  // Pick a Delivered order; make it return-eligible (staging is throwaway).
  const order = await prisma.order.findFirst({ where: { status: "Delivered" } });
  if (!order) { log("no delivered order"); process.exit(1); }
  await prisma.order.update({ where: { id: order.id }, data: { deliveredAt: new Date(), statusV2: "DELIVERED" } });
  const item = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
  await prisma.orderItem.update({ where: { id: item.id }, data: { status: "ACTIVE" } });
  const productBefore = item.productId ? await prisma.product.findUnique({ where: { id: item.productId }, select: { stock: true } }) : null;
  log(`order ${order.orderNumber} item ${item.id} (product stock ${productBefore?.stock ?? "n/a"})`);

  // 1) Return request — CHANGE_OF_MIND (no investigation) → schedules pickup.
  log("\n1) requestReturn(CHANGE_OF_MIND)");
  const rr = await requestReturn({ orderItemId: item.id, reason: "CHANGE_OF_MIND", actor: { role: "CUSTOMER" }, customerDamaged: false });
  check(`routed to PICKUP_SCHEDULED (got ${rr.target})`, rr.target === "PICKUP_SCHEDULED");
  check("ok", rr.ok);

  // 2) Pickup → 3) receive → auto-QC PASSED → REFUND_APPROVED
  log("\n2) markPickedUp → 3) receiveForQc (auto-QC)");
  await markPickedUp(item.id);
  await receiveForQc(item.id);
  let cur = await prisma.orderItem.findUnique({ where: { id: item.id }, select: { status: true } });
  check(`item REFUND_APPROVED after auto-QC (got ${cur.status})`, cur.status === "REFUND_APPROVED");

  // inventory restocked by QC pass
  if (item.productId) {
    const after = await prisma.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
    check(`inventory restocked +${item.qty} (${productBefore.stock} → ${after.stock})`, after.stock === productBefore.stock + item.qty);
    const tx = await prisma.inventoryTransaction.findFirst({ where: { orderItemId: item.id, type: "RESTOCK_QC_PASS" } });
    check("RESTOCK_QC_PASS ledger row exists", Boolean(tx));
  }

  // 4) Create refund within ceiling, then simulate gateway webhook → REFUNDED
  log("\n4) createRefund + applyRefundWebhook(REFUNDED)");
  const ceilingTry = await createRefund({ orderId: order.id, orderItemId: item.id, amountPaise: (order.amountPaidPaise ?? order.total * 100) + 100, reason: "over", idempotencyKey: `${item.id}-over`, actor: ADMIN });
  check("over-refund rejected by ceiling guard", ceilingTry.ok === false);

  const ref = await createRefund({ orderId: order.id, orderItemId: item.id, amountPaise: item.netPaidPaise, reason: "return refund", idempotencyKey: `${item.id}-refund`, actor: ADMIN });
  check("refund created (PENDING)", ref.ok);
  const refundRow = await prisma.refund.update({ where: { id: ref.refundId }, data: { status: "PROCESSING", refundReference: `RF-${order.orderNumber}-e2e` } });
  const wh = await applyRefundWebhook({ provider: "phonepe", eventId: `evt-${order.id}-1`, merchantRefundId: refundRow.refundReference, incoming: "REFUNDED" });
  check("webhook applied → REFUNDED", wh.applied);
  // idempotency: same event again is ignored
  const dup = await applyRefundWebhook({ provider: "phonepe", eventId: `evt-${order.id}-1`, merchantRefundId: refundRow.refundReference, incoming: "REFUNDED" });
  check("duplicate webhook ignored", dup.applied === false);

  cur = await prisma.orderItem.findUnique({ where: { id: item.id }, select: { status: true } });
  check(`item REFUNDED (got ${cur.status})`, cur.status === "REFUNDED");
  const cn = await prisma.creditNote.findFirst({ where: { orderId: order.id } });
  check("GST credit note issued", Boolean(cn));

  // 5) Close item + derive order status
  log("\n5) close item + recomputeOrderStatus");
  const { transitionEntity } = await import("../src/lib/postorder/transition-engine.ts");
  await transitionEntity({ kind: "item", id: item.id, to: "CLOSED", actor: ADMIN, reason: "resolved" });
  const der = await recomputeOrderStatus(order.id, ADMIN);
  const ord = await prisma.order.findUnique({ where: { id: order.id }, select: { statusV2: true } });
  check(`order derived to CLOSED (single-item, all closed) — got ${ord.statusV2}`, ord.statusV2 === "CLOSED");

  // 6) audit trail recorded
  const audit = await prisma.orderStatusHistory.count({ where: { orderId: order.id } });
  check(`audit trail has multiple transitions (${audit})`, audit >= 5);

  log(`\n${failures === 0 ? "E2E PASS ✅" : `E2E FAIL ❌ (${failures})`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 2);
})();
