// Post-order v2 backfill — idempotent & resumable. Populates paise money,
// statusV2/paymentState/refundState, order_items (from items JSON), refunds,
// reverse_pickups/replacement_orders (flat fields), disputes (from tickets),
// and a per-order audit baseline. Safe to re-run (NULL-guards + stable ids).
//
//   node scripts/postorder-backfill.mjs "<DATABASE_URL>"        # backfill
//   node scripts/postorder-backfill.mjs "<DATABASE_URL>" --verify  # verify only
import { PrismaClient } from "@prisma/client";

const url = process.argv[2] || process.env.DATABASE_URL;
const verifyOnly = process.argv.includes("--verify");
if (!url) { console.error("Pass DATABASE_URL as argv[2]."); process.exit(1); }
const prisma = new PrismaClient({ datasourceUrl: url });

const ITEM_STATUS_BY_ORDER = {
  Cancelled: "CLOSED", Returned: "REFUNDED", Refunded: "REFUNDED", Replacement: "REPLACEMENT_APPROVED",
};
function prorate(total, weights) {
  if (!weights.length) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  let idx = 0; for (let i = 1; i < weights.length; i++) if (weights[i] > weights[idx]) idx = i;
  parts[idx] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

async function backfillMoneyAndEnums() {
  const stmts = [
    `UPDATE "Order" SET "subtotalPaise"=subtotal*100 WHERE "subtotalPaise" IS NULL`,
    `UPDATE "Order" SET "totalPaise"=total*100 WHERE "totalPaise" IS NULL`,
    `UPDATE "Order" SET "discountPaise"=discount*100 WHERE "discountPaise" IS NULL`,
    `UPDATE "Order" SET "instantDiscountPaise"="instantDiscount"*100 WHERE "instantDiscountPaise" IS NULL`,
    `UPDATE "Order" SET "shippingPaise"=shipping*100 WHERE "shippingPaise" IS NULL`,
    `UPDATE "Order" SET "refundedPaise"="refundAmount"*100 WHERE "refundAmount">0 AND "refundedPaise"=0`,
    `UPDATE "Order" SET "amountPaidPaise" = CASE
        WHEN "paymentMethod"='PhonePe' AND "paymentStatus"='Paid' THEN total*100
        WHEN "paymentMethod"='COD' AND status IN ('Delivered','Returned','Replacement','Refunded') THEN total*100
        ELSE 0 END
      WHERE "amountPaidPaise" IS NULL`,
    `UPDATE "Order" SET "statusV2" = CASE status
        WHEN 'Pending' THEN 'PENDING'::"OrderStatus" WHEN 'Confirmed' THEN 'CONFIRMED'::"OrderStatus"
        WHEN 'Packed' THEN 'PROCESSING'::"OrderStatus" WHEN 'Shipped' THEN 'SHIPPED'::"OrderStatus"
        WHEN 'Delivered' THEN 'DELIVERED'::"OrderStatus" WHEN 'Cancelled' THEN 'CANCELLED'::"OrderStatus"
        WHEN 'Returned' THEN 'RETURNED'::"OrderStatus" WHEN 'Replacement' THEN 'DELIVERED'::"OrderStatus"
        WHEN 'Refunded' THEN 'RETURNED'::"OrderStatus" ELSE 'PENDING'::"OrderStatus" END
      WHERE "statusV2" IS NULL`,
    `UPDATE "Order" SET "paymentState" = CASE
        WHEN "paymentStatus"='Paid' THEN 'PAID'::"PaymentStatus" WHEN "paymentStatus"='Failed' THEN 'FAILED'::"PaymentStatus"
        WHEN "paymentStatus"='Pending' THEN 'PENDING'::"PaymentStatus"
        WHEN "paymentMethod"='COD' AND status IN ('Delivered','Returned','Replacement','Refunded') THEN 'PAID'::"PaymentStatus"
        ELSE 'PENDING'::"PaymentStatus" END
      WHERE "paymentState" IS NULL`,
    `UPDATE "Order" SET "paymentState"='REFUNDED'::"PaymentStatus" WHERE ("refundStatus"='Completed' OR status='Refunded') AND "paymentState" <> 'REFUNDED'`,
    `UPDATE "Order" SET "refundState" = CASE
        WHEN "refundStatus"='Completed' THEN 'REFUNDED'::"RefundStatus" WHEN "refundStatus"='Initiated' THEN 'PROCESSING'::"RefundStatus"
        WHEN "refundStatus"='Failed' THEN 'FAILED'::"RefundStatus" ELSE 'NOT_APPLICABLE'::"RefundStatus" END
      WHERE "refundState" IS NULL`,
    `UPDATE "Product" SET "pricePaise"=price*100 WHERE "pricePaise" IS NULL`,
    `UPDATE "Product" SET "mrpPaise"=mrp*100 WHERE "mrpPaise" IS NULL`,
    `UPDATE "Product" SET "costPaise"=cost*100 WHERE "costPaise" IS NULL`,
    `UPDATE "Coupon" SET "valuePaise"=value*100 WHERE "valuePaise" IS NULL AND type <> 'percent'`,
    `UPDATE "Coupon" SET "minOrderPaise"="minOrder"*100 WHERE "minOrderPaise" IS NULL`,
    `UPDATE "Coupon" SET "maxDiscountPaise"="maxDiscount"*100 WHERE "maxDiscountPaise" IS NULL`,
    `UPDATE "StoreSetting" SET "freeShippingThresholdPaise"="freeShippingThreshold"*100 WHERE "freeShippingThresholdPaise" IS NULL`,
    `UPDATE "StoreSetting" SET "shippingFeePaise"="shippingFee"*100 WHERE "shippingFeePaise" IS NULL`,
    `UPDATE "StoreSetting" SET "browseOfferAmountPaise"="browseOfferAmount"*100 WHERE "browseOfferAmountPaise" IS NULL`,
    `UPDATE "StoreSetting" SET "cartOfferAmountPaise"="cartOfferAmount"*100 WHERE "cartOfferAmountPaise" IS NULL`,
  ];
  let total = 0;
  for (const sql of stmts) total += await prisma.$executeRawUnsafe(sql);
  return total;
}

async function backfillOrderItems() {
  const orders = await prisma.order.findMany();
  let created = 0;
  for (const o of orders) {
    const has = await prisma.orderItem.count({ where: { orderId: o.id } });
    if (has > 0) continue; // idempotent
    let items = [];
    try { items = JSON.parse(o.items || "[]"); } catch { items = []; }
    if (!items.length) continue;
    const lineSubs = items.map((i) => Math.round(Number(i.price) || 0) * 100 * (Number(i.qty) || 1));
    const discAlloc = prorate(o.discountPaise ?? o.discount * 100, lineSubs);
    const shipAlloc = prorate(o.shippingPaise ?? o.shipping * 100, lineSubs);
    const itemStatus = ITEM_STATUS_BY_ORDER[o.status] ?? "ACTIVE";
    const resolved = ["REFUNDED", "REPLACED"].includes(itemStatus);
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const qty = Number(it.qty) || 1;
      const unit = Math.round(Number(it.price) || 0) * 100;
      const net = lineSubs[idx] - discAlloc[idx] + shipAlloc[idx];
      await prisma.orderItem.create({
        data: {
          id: `${o.id}-itm-${idx}`,
          orderId: o.id,
          productId: it.id ?? null,
          productSlug: it.slug ?? "",
          name: it.name ?? "Item",
          qty,
          unitPricePaise: unit,
          lineSubtotalPaise: lineSubs[idx],
          allocatedDiscountPaise: discAlloc[idx],
          allocatedShippingPaise: shipAlloc[idx],
          netPaidPaise: net,
          status: itemStatus,
          refundedPaise: resolved ? Math.max(0, net) : 0,
          resolvedAt: resolved ? o.updatedAt : null,
        },
      });
      created++;
    }
  }
  return created;
}

async function backfillRefunds() {
  const orders = await prisma.order.findMany({ where: { refundStatus: { not: "" } } });
  let created = 0;
  for (const o of orders) {
    if ((o.refundAmount ?? 0) <= 0) continue;
    const key = `${o.id}-rf-migrated`;
    const exists = await prisma.refund.findUnique({ where: { idempotencyKey: key } });
    if (exists) continue;
    const status = o.refundStatus === "Completed" ? "REFUNDED" : o.refundStatus === "Initiated" ? "PROCESSING" : o.refundStatus === "Failed" ? "FAILED" : "PENDING";
    await prisma.refund.create({
      data: {
        orderId: o.id, amountPaise: o.refundAmount * 100, status, method: "ORIGINAL",
        reason: "migrated from legacy refund fields", idempotencyKey: key,
        refundReference: o.refundRef || "", gatewayReference: o.refundRef || "",
        completedAt: status === "REFUNDED" ? o.updatedAt : null,
      },
    });
    created++;
  }
  return created;
}

async function backfillReversePickupsAndReplacements() {
  let rp = 0, ro = 0;
  const withReturn = await prisma.order.findMany({ where: { returnShipmentId: { not: "" } } });
  for (const o of withReturn) {
    const key = `${o.id}-rp-migrated`;
    if (await prisma.reversePickup.findUnique({ where: { idempotencyKey: key } })) continue;
    await prisma.reversePickup.create({ data: { orderId: o.id, provider: "shiprocket", providerOrderId: o.returnOrderId || "", shipmentId: o.returnShipmentId || "", awb: o.returnAwb || "", courier: o.returnCourier || "", trackingUrl: o.returnTrackingUrl || "", status: "PICKED_UP", idempotencyKey: key } });
    rp++;
  }
  const withRepl = await prisma.order.findMany({ where: { replacementShipmentId: { not: "" } } });
  for (const o of withRepl) {
    const key = `${o.id}-repl-migrated`;
    if (await prisma.replacementOrder.findUnique({ where: { idempotencyKey: key } })) continue;
    const firstItem = await prisma.orderItem.findFirst({ where: { orderId: o.id } });
    await prisma.replacementOrder.create({ data: { originalOrderId: o.id, originalItemId: firstItem?.id ?? `${o.id}-itm-0`, replacementOrderId: o.replacementOrderId || null, state: "DISPATCHED", idempotencyKey: key } });
    ro++;
  }
  return { rp, ro };
}

const REASON_BY_CATEGORY = { Damaged: "DAMAGED_PRODUCT", Defective: "DEFECTIVE_PRODUCT", "Wrong item": "WRONG_ITEM_RECEIVED", "Not working": "DEFECTIVE_PRODUCT", Other: "QUALITY_ISSUE" };
const DISPUTE_STATUS_BY_TICKET = { Open: "RAISED", "Awaiting proof": "RAISED", "Under review": "UNDER_INVESTIGATION", Resolved: "CLOSED", Rejected: "REJECTED" };
async function backfillDisputes() {
  const tickets = await prisma.ticket.findMany({ include: { messages: true } });
  let created = 0;
  for (const t of tickets) {
    if (await prisma.dispute.findFirst({ where: { legacyTicketId: t.id } })) continue;
    const items = await prisma.orderItem.findMany({ where: { orderId: t.orderId }, select: { id: true } });
    const d = await prisma.dispute.create({
      data: {
        disputeNumber: `DSP-${t.ticketNumber}`, orderId: t.orderId, customerId: t.customerId ?? null, email: t.email,
        reason: REASON_BY_CATEGORY[t.category] ?? null, category: t.category, description: t.description,
        status: DISPUTE_STATUS_BY_TICKET[t.status] ?? "RAISED", legacyTicketId: t.id,
        closedAt: ["Resolved", "Rejected"].includes(t.status) ? t.updatedAt : null,
        items: { create: items.map((i) => ({ orderItemId: i.id })) },
        messages: { create: t.messages.map((m) => ({ author: m.author, body: m.body, attachments: m.attachments, proofRequest: m.proofRequest, legacyMessageId: m.id })) },
      },
    });
    if (d) created++;
  }
  return created;
}

async function backfillAuditBaseline() {
  const orders = await prisma.order.findMany({ select: { id: true, statusV2: true } });
  let created = 0;
  for (const o of orders) {
    const has = await prisma.orderStatusHistory.count({ where: { entityType: "ORDER", entityId: o.id } });
    if (has > 0) continue;
    await prisma.orderStatusHistory.create({ data: { entityType: "ORDER", entityId: o.id, orderId: o.id, previousState: "", newState: o.statusV2 ?? "PENDING", actorRole: "SYSTEM", reason: "post-order v2 migration baseline" } });
    created++;
  }
  return created;
}

async function verify() {
  const fail = [];
  const orders = await prisma.order.findMany();
  // 1) order_items count == sum of JSON item lengths
  let expectedItems = 0;
  for (const o of orders) { try { expectedItems += (JSON.parse(o.items || "[]") || []).length; } catch {} }
  const actualItems = await prisma.orderItem.count();
  if (actualItems !== expectedItems) fail.push(`order_items ${actualItems} != expected ${expectedItems}`);
  // 2) statusV2 populated for all
  const nullStatus = await prisma.order.count({ where: { statusV2: null } });
  if (nullStatus > 0) fail.push(`${nullStatus} orders have null statusV2`);
  // 3) refund reconciliation: per order, counted refunds <= amountPaid
  const refunds = await prisma.refund.findMany();
  const byOrder = {};
  for (const r of refunds) if (["REFUNDED", "PROCESSING", "PARTIALLY_REFUNDED"].includes(r.status)) byOrder[r.orderId] = (byOrder[r.orderId] || 0) + r.amountPaise;
  for (const o of orders) { const paid = o.amountPaidPaise ?? o.total * 100; if ((byOrder[o.id] || 0) > paid) fail.push(`order ${o.orderNumber} over-refunded: ${byOrder[o.id]} > ${paid}`); }
  // 4) no orphan order_items
  const orderIds = new Set(orders.map((o) => o.id));
  const items = await prisma.orderItem.findMany({ select: { orderId: true } });
  for (const it of items) if (!orderIds.has(it.orderId)) fail.push(`orphan order_item → ${it.orderId}`);
  // 5) paise present
  const nullPaise = await prisma.order.count({ where: { totalPaise: null } });
  if (nullPaise > 0) fail.push(`${nullPaise} orders have null totalPaise`);
  return fail;
}

(async () => {
  if (!verifyOnly) {
    console.log("money/enums updated rows:", await backfillMoneyAndEnums());
    console.log("order_items created:", await backfillOrderItems());
    console.log("refunds created:", await backfillRefunds());
    console.log("reverse_pickups/replacements:", await backfillReversePickupsAndReplacements());
    console.log("disputes created:", await backfillDisputes());
    console.log("audit baseline rows:", await backfillAuditBaseline());
  }
  const failures = await verify();
  if (failures.length) { console.log("VERIFY: FAIL ❌"); failures.forEach((f) => console.log("  -", f)); process.exitCode = 2; }
  else console.log("VERIFY: PASS ✅ (row counts, statusV2, refund reconciliation, no orphans, paise present)");
  await prisma.$disconnect();
})();
