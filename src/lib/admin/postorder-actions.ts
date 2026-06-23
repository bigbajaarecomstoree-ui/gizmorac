"use server";

// Admin item-level post-order actions. Thin wrappers over the v2 services — the
// admin holds all roles while ffRbac is off (actor ADMIN). Every state change
// flows through the transition engine inside those services.

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ReturnReason } from "@prisma/client";
import { requestReturn, scheduleReturnPickup, markPickedUp, receiveForQc } from "@/lib/postorder/returns";
import { runQc } from "@/lib/postorder/qc-service";
import { approveReplacement, markReplacementDelivered } from "@/lib/postorder/replacements";
import { createRefund, processRefund, applyRefundWebhook } from "@/lib/postorder/refund-engine";
import { transitionEntity, recomputeOrderStatus } from "@/lib/postorder/transition-engine";
import { cancelShiprocketOrder } from "@/lib/shiprocket";
import type { QcResolution } from "@/lib/postorder/qc";

const ACTOR = { role: "ADMIN" as const, id: "admin", email: "admin" };

export interface OpResult {
  ok: boolean;
  note?: string;
  error?: string;
}

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}
function done(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function adminRequestReturn(orderId: string, orderItemId: string, reason: ReturnReason): Promise<OpResult> {
  await guard();
  const r = await requestReturn({ orderItemId, reason, actor: ACTOR });
  await recomputeOrderStatus(orderId, ACTOR);
  done(orderId);
  return { ok: r.ok, note: r.ok ? `Return started → ${r.target}` : undefined, error: r.error };
}

export async function adminSchedulePickup(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const r = await scheduleReturnPickup({ orderItemId, actor: ACTOR });
  done(orderId);
  return { ok: r.ok, note: r.ok ? "Reverse pickup scheduled" : undefined, error: r.error };
}

export async function adminMarkPickedUp(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const r = await markPickedUp(orderItemId, ACTOR);
  done(orderId);
  return { ok: r.ok, note: r.ok ? "Marked picked up" : undefined, error: r.error };
}

export async function adminReceiveForQc(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const r = await receiveForQc(orderItemId, ACTOR);
  await recomputeOrderStatus(orderId, ACTOR);
  done(orderId);
  return { ok: r.ok, note: r.ok ? "Received — QC run" : undefined, error: r.error };
}

export async function adminRunQc(
  orderId: string,
  orderItemId: string,
  result: "PASSED" | "PARTIAL" | "FAILED",
  resolution: QcResolution = "refund",
  deductionPaise = 0,
): Promise<OpResult> {
  await guard();
  const r = await runQc({ orderItemId, result, resolution, deductionPaise, actor: ACTOR });
  await recomputeOrderStatus(orderId, ACTOR);
  done(orderId);
  return { ok: r.ok, note: r.ok ? `QC ${result} → ${r.next}` : undefined, error: r.error };
}

/** Approve + send a refund for one item (net of any restocking deduction). */
export async function adminRefundItem(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId }, select: { netPaidPaise: true, deductionPaise: true } });
  if (!item) return { ok: false, error: "Item not found." };
  const amount = Math.max(0, item.netPaidPaise - item.deductionPaise);
  const created = await createRefund({ orderId, orderItemId, amountPaise: amount, reason: "return refund", idempotencyKey: `${orderItemId}-refund`, actor: ACTOR });
  if (!created.ok || !created.refundId) return { ok: false, error: created.error };
  const proc = await processRefund(created.refundId, ACTOR);
  done(orderId);
  if (proc.status === "PROCESSING") return { ok: true, note: "Refund sent — completes via gateway webhook" };
  if (proc.status === "MANUAL_REVIEW") return { ok: true, note: "Refund needs a manual payout — then click “Mark refund paid”" };
  return { ok: proc.ok, note: proc.ok ? `Refund ${proc.status}` : undefined, error: proc.error };
}

/** Manually confirm a refund as paid (COD / manual payout) → item REFUNDED. */
export async function adminCompleteRefund(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const refund = await prisma.refund.findFirst({ where: { orderItemId, status: { in: ["PROCESSING", "MANUAL_REVIEW", "PENDING", "FAILED"] } } });
  if (!refund) return { ok: false, error: "No open refund for this item." };
  let ref = refund.refundReference;
  if (!ref) {
    ref = `MANUAL-${refund.id.slice(-8)}`;
    await prisma.refund.update({ where: { id: refund.id }, data: { refundReference: ref } });
  }
  const r = await applyRefundWebhook({ provider: "manual", eventId: `manual-${refund.id}-${Date.now()}`, merchantRefundId: ref, incoming: "REFUNDED" });
  await recomputeOrderStatus(orderId, ACTOR);
  done(orderId);
  return { ok: r.applied, note: r.applied ? "Refund marked paid" : undefined, error: r.applied ? undefined : r.reason };
}

export async function adminApproveReplacement(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const r = await approveReplacement({ orderItemId, actor: ACTOR });
  done(orderId);
  if (r.outOfStock) return { ok: false, error: "Out of stock — refund instead, or backorder." };
  return { ok: r.ok, note: r.ok ? "Replacement approved + stock reserved" : undefined, error: r.error };
}

export async function adminMarkReplacementDelivered(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const link = await prisma.replacementOrder.findFirst({ where: { originalItemId: orderItemId } });
  if (!link) return { ok: false, error: "No replacement on this item." };
  const r = await markReplacementDelivered(link.id, ACTOR);
  await recomputeOrderStatus(orderId, ACTOR);
  done(orderId);
  return { ok: r.ok, note: r.ok ? "Replacement delivered → item replaced & closed" : undefined, error: r.error };
}

export async function adminCloseItem(orderId: string, orderItemId: string): Promise<OpResult> {
  await guard();
  const t = await transitionEntity({ kind: "item", id: orderItemId, to: "CLOSED", actor: ACTOR, reason: "closed by admin" });
  await recomputeOrderStatus(orderId, ACTOR);
  done(orderId);
  return { ok: t.ok, note: t.ok ? "Item closed" : undefined, error: t.error };
}

/** Advance order fulfilment (CONFIRMED→PROCESSING→SHIPPED→OUT_FOR_DELIVERY→DELIVERED / RTO). */
export async function adminAdvanceFulfillment(orderId: string, to: string): Promise<OpResult> {
  await guard();
  const t = await transitionEntity({ kind: "order", id: orderId, to, actor: ACTOR, reason: `fulfilment → ${to}` });
  if (t.ok && to === "DELIVERED") {
    await prisma.order.update({ where: { id: orderId }, data: { deliveredAt: new Date() } });
  }
  done(orderId);
  return { ok: t.ok, note: t.ok ? `Order → ${to}` : undefined, error: t.error };
}

/** Cancel an order: override → CANCELLED, freeze items to CLOSED, refund if paid pre-ship. */
export async function adminCancelOrder(orderId: string): Promise<OpResult> {
  await guard();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      statusV2: true,
      paymentState: true,
      paymentStatus: true,
      paymentMethod: true,
      amountPaidPaise: true,
      totalPaise: true,
      total: true,
      shiprocketOrderId: true,
      awb: true,
    },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const t = await transitionEntity({ kind: "order", id: orderId, to: "CANCELLED", actor: ACTOR, reason: "cancelled by admin" });
  if (!t.ok) return { ok: false, error: t.error ?? "Can't cancel at this stage (already shipped — use RTO)." };

  const items = await prisma.orderItem.findMany({ where: { orderId }, select: { id: true, status: true } });
  for (const it of items) {
    if (it.status !== "CLOSED") {
      await transitionEntity({ kind: "item", id: it.id, to: "CLOSED", actor: ACTOR, override: true, reason: "order cancelled" });
    }
  }

  const parts = ["Order cancelled."];

  // Cancel the Shiprocket shipment too (refunds freight to the wallet) — best-effort.
  if (order.shiprocketOrderId) {
    const c = await cancelShiprocketOrder({ shiprocketOrderId: order.shiprocketOrderId, awb: order.awb || undefined });
    await prisma.order.update({ where: { id: orderId }, data: { shipmentStatus: "Cancelled" } });
    parts.push(c.ok ? "Shipment cancelled." : `Shipment needs a manual cancel (${c.error}).`);
  }

  // Refund the customer's online payment. Robust against orders whose v2
  // paymentState wasn't synced (fall back to the legacy "Paid" signal + total).
  const paidOnline =
    order.paymentMethod === "PhonePe" &&
    (order.paymentState === "PAID" || order.paymentStatus === "Paid");
  if (paidOnline) {
    const amt =
      order.amountPaidPaise && order.amountPaidPaise > 0
        ? order.amountPaidPaise
        : order.totalPaise ?? order.total * 100;
    // Backfill the paid amount so the over-refund guard has the right ceiling.
    if (!order.amountPaidPaise || order.amountPaidPaise <= 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: { amountPaidPaise: amt, paymentState: "PAID" },
      });
    }
    if (amt > 0) {
      const created = await createRefund({ orderId, amountPaise: amt, reason: "order cancelled", idempotencyKey: `${orderId}-cancel-refund`, actor: ACTOR });
      if (created.ok && created.refundId) {
        await processRefund(created.refundId, ACTOR);
        parts.push("Refund initiated.");
      }
    }
  }
  done(orderId);
  return { ok: true, note: parts.join(" ") };
}
