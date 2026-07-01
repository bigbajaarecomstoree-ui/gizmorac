"use server";

// Admin COD / RTO operations. Additive: they drive the orthogonal COD fields
// (deliveryPaymentStatus, rtoStatus) + payment override, never the existing
// order-status machine or refund architecture. Every op is assertAdmin-gated,
// idempotent (compare-and-swap), and audit-logged with previous/next values.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/data/logs";
import { applyInventoryTxn } from "@/lib/postorder/inventory";
import { revalidateAdminOrderViews } from "@/lib/data/revalidate";
import { COD_PINCODE_MODES } from "@/lib/data/cod-pincode";

export interface CodOpResult {
  ok: boolean;
  note?: string;
  error?: string;
}

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

function done(orderId: string) {
  revalidateAdminOrderViews();
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Audit row + event log carrying the before/after values (spec: observability). */
async function audit(
  order: { id: string; orderNumber: string },
  field: string,
  previous: string,
  next: string,
  action: string,
  message: string,
) {
  await prisma.orderStatusHistory.create({
    data: {
      entityType: "ORDER",
      entityId: order.id,
      orderId: order.id,
      previousState: previous,
      newState: next,
      actorRole: "ADMIN",
      reason: action,
    },
  });
  await logEvent({
    actor: "admin",
    action,
    message,
    meta: { orderId: order.id, orderNumber: order.orderNumber, field, previous, next },
  });
}

/** Mark the cash collected on delivery. CAS so it can only succeed once. */
export async function markDeliveryCollected(orderId: string): Promise<CodOpResult> {
  await guard();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, orderNumber: true, paymentMethod: true,
      total: true, codAdvancePaise: true, codRemainingPaise: true, deliveryPaymentStatus: true,
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentMethod !== "COD") return { ok: false, error: "Not a COD order." };

  // Amount due on delivery: the remaining for advance orders, else the full total.
  const duePaise = order.codAdvancePaise > 0 ? order.codRemainingPaise : order.total * 100;

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, deliveryPaymentStatus: { not: "COLLECTED" } },
    data: { deliveryPaymentStatus: "COLLECTED", deliveryCollectedPaise: duePaise, paymentStatus: "Paid" },
  });
  if (claimed.count === 0) {
    await logEvent({ actor: "admin", action: "cod.delivery_collected.duplicate", message: `Duplicate delivery-collection ignored for ${order.orderNumber}`, meta: { orderId } });
    return { ok: true, note: "Already collected." };
  }
  await audit(order, "deliveryPaymentStatus", order.deliveryPaymentStatus || "PENDING", "COLLECTED",
    "cod.delivery_collected", `Delivery payment collected for ${order.orderNumber}: ₹${duePaise / 100}`);
  done(orderId);
  return { ok: true, note: `Collected ₹${(duePaise / 100).toLocaleString("en-IN")} on delivery.` };
}

/** Delivery attempt failed (first step of the RTO path). */
export async function markDeliveryFailed(orderId: string): Promise<CodOpResult> {
  await guard();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
  if (!order) return { ok: false, error: "Order not found." };
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, rtoStatus: "NONE" },
    data: { rtoStatus: "DELIVERY_FAILED" },
  });
  if (claimed.count === 0) return { ok: true, note: "RTO already in progress." };
  await audit(order, "rtoStatus", "NONE", "DELIVERY_FAILED", "cod.delivery_failed", `Delivery failed for ${order.orderNumber}`);
  done(orderId);
  return { ok: true, note: "Marked delivery failed." };
}

/** Return-to-origin started. */
export async function markRtoInitiated(orderId: string): Promise<CodOpResult> {
  await guard();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, rtoStatus: true } });
  if (!order) return { ok: false, error: "Order not found." };
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, rtoStatus: { in: ["NONE", "DELIVERY_FAILED"] } },
    data: { rtoStatus: "RTO_INITIATED" },
  });
  if (claimed.count === 0) return { ok: true, note: "RTO already initiated or received." };
  await audit(order, "rtoStatus", order.rtoStatus, "RTO_INITIATED", "cod.rto_initiated", `RTO initiated for ${order.orderNumber}`);
  done(orderId);
  return { ok: true, note: "Marked RTO initiated." };
}

/** RTO parcel received back: restock inventory, forfeit the advance, close the order. */
export async function markRtoReceived(orderId: string): Promise<CodOpResult> {
  await guard();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, items: true, rtoStatus: true, codAdvancePaise: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, rtoStatus: { not: "RTO_RECEIVED" } },
    data: { rtoStatus: "RTO_RECEIVED", status: "Returned" },
  });
  if (claimed.count === 0) return { ok: true, note: "Already received." };

  // Restock each item (idempotent via the ledger key).
  let items: { id: string; qty: number }[] = [];
  try { items = JSON.parse(order.items); } catch { items = []; }
  for (const it of items) {
    if (!it?.id || !it?.qty) continue;
    await applyInventoryTxn({
      productId: it.id, delta: it.qty, type: "RTO_RESTOCK", orderId: order.id,
      reason: "RTO received", idempotencyKey: `${order.id}-rto-${it.id}`,
    });
  }

  const forfeit = order.codAdvancePaise > 0 ? ` Advance ₹${order.codAdvancePaise / 100} forfeited.` : "";
  await audit(order, "rtoStatus", order.rtoStatus, "RTO_RECEIVED", "cod.rto_received",
    `RTO received for ${order.orderNumber} — items restocked.${forfeit}`);
  done(orderId);
  return { ok: true, note: `RTO received — items restocked.${forfeit}` };
}

const PAYMENT_STATES = ["Pending", "PartiallyPaid", "Paid", "Failed"];

/** Manual payment-status override (admin judgement; fully logged). */
export async function overridePaymentStatus(orderId: string, status: string): Promise<CodOpResult> {
  await guard();
  if (!PAYMENT_STATES.includes(status)) return { ok: false, error: "Invalid payment status." };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, paymentStatus: true } });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus === status) return { ok: true, note: "No change." };
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
  await audit(order, "paymentStatus", order.paymentStatus || "Pending", status, "cod.payment_override",
    `Payment status overridden for ${order.orderNumber}: ${order.paymentStatus || "Pending"} → ${status}`);
  done(orderId);
  return { ok: true, note: `Payment status set to ${status}.` };
}

// ───────── Per-pincode COD rules (bonus) ─────────

/** Create or update a per-pincode COD rule. */
export async function saveCodPincodeRule(formData: FormData): Promise<CodOpResult> {
  await guard();
  const pincode = (formData.get("pincode") ?? "").toString().trim();
  const mode = (formData.get("mode") ?? "STANDARD").toString();
  const overrideRaw = (formData.get("advanceOverride") ?? "").toString().trim();
  const note = (formData.get("note") ?? "").toString().trim().slice(0, 120);
  if (!/^\d{6}$/.test(pincode)) return { ok: false, error: "Enter a valid 6-digit pincode." };
  if (!COD_PINCODE_MODES.includes(mode as never)) return { ok: false, error: "Invalid mode." };
  const n = Number(overrideRaw);
  const advanceOverride = overrideRaw && Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;

  await prisma.codPincodeRule.upsert({
    where: { pincode },
    update: { mode, advanceOverride, note },
    create: { pincode, mode, advanceOverride, note },
  });
  await logEvent({ actor: "admin", action: "cod.pincode_rule.save", message: `COD pincode rule ${pincode} → ${mode}`, meta: { pincode, mode, advanceOverride } });
  revalidatePath("/admin/cod");
  return { ok: true, note: `Saved rule for ${pincode}.` };
}

/** Remove a per-pincode COD rule. */
export async function deleteCodPincodeRule(id: string): Promise<CodOpResult> {
  await guard();
  await prisma.codPincodeRule.delete({ where: { id } }).catch(() => {});
  await logEvent({ actor: "admin", action: "cod.pincode_rule.delete", message: "COD pincode rule removed", meta: { id } });
  revalidatePath("/admin/cod");
  return { ok: true, note: "Rule removed." };
}
