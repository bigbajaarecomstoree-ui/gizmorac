// Shared order money/logistics operations used by both the admin actions and
// the customer-facing order actions. Server-only (touches the DB + gateways).

import { prisma } from "@/lib/prisma";
import { initiateRefund } from "@/lib/phonepe";
import { cancelShiprocketOrder } from "@/lib/shiprocket";
import { applyInventoryTxn } from "@/lib/postorder/inventory";

export interface RefundOutcome {
  ok: boolean;
  /** Whether an online refund was actually fired (false for COD / unpaid). */
  moved: boolean;
  amount: number;
  error?: string;
}

/**
 * Send a real refund for an order paid online via PhonePe and record it on the
 * order. Cash / unpaid / already-refunded orders need no money movement. Returns
 * ok:false only when a refund was attempted and the gateway rejected it.
 */
export async function refundOrderPayment(orderId: string): Promise<RefundOutcome> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, moved: false, amount: 0, error: "Order not found." };

  if (order.paymentMethod !== "PhonePe" || order.paymentStatus !== "Paid") {
    return { ok: true, moved: false, amount: 0 };
  }
  if (order.refundStatus === "Initiated" || order.refundStatus === "Completed") {
    return { ok: true, moved: false, amount: order.refundAmount || order.total };
  }
  if (order.total <= 0) return { ok: true, moved: false, amount: 0 };

  // Atomic claim — only the caller that flips refundStatus "" → "Processing"
  // owns the refund, so an admin double-click, an admin cancel racing a customer
  // cancel, or a retried request can never fire two refunds for the same money.
  // Mirrors refundCodAdvance's CAS; prepaid orders start with refundStatus "".
  const claim = await prisma.order.updateMany({
    where: { id: order.id, paymentMethod: "PhonePe", paymentStatus: "Paid", refundStatus: "" },
    data: { refundStatus: "Processing" },
  });
  if (claim.count === 0) {
    // Another caller already claimed/sent it — move no money.
    return { ok: true, moved: false, amount: order.refundAmount || order.total };
  }

  const merchantRefundId = `RF-${order.orderNumber}-${Date.now().toString(36)}`;
  const res = await initiateRefund({
    merchantRefundId,
    merchantOrderId: order.orderNumber,
    amountPaise: order.total * 100,
  });
  if (!res.ok) {
    // Release the claim so the cancel/refund can be retried without losing it.
    await prisma.order.updateMany({
      where: { id: order.id, refundStatus: "Processing" },
      data: { refundStatus: "" },
    });
    return { ok: false, moved: false, amount: order.total, error: res.error };
  }
  await prisma.order.update({
    where: { id: order.id },
    data: {
      refundStatus: "Initiated",
      refundRef: merchantRefundId,
      refundAmount: order.total,
    },
  });
  return { ok: true, moved: true, amount: order.total };
}

/**
 * Refund a COD order's online booking advance — the small amount paid up front
 * via PhonePe on a COD-advance order. `refundOrderPayment` deliberately handles
 * only fully-prepaid PhonePe orders, so this is the additive counterpart for the
 * advance; the two are mutually exclusive by `paymentMethod` (at most one moves
 * money for a given order). Fired on a pre-dispatch cancel per the cancellation
 * matrix (cancel-before-dispatch / not-shipped → refund; refusal / RTO /
 * unreachable forfeit and never route through here). Standard COD orders and
 * orders with no advance are a no-op, so existing behaviour is unchanged.
 *
 * Exactly-once under double-clicks / callback retries / multiple tabs: an atomic
 * CAS claim flips the order's `refundStatus` from "" → "Processing" before the
 * gateway call (refundStatus is otherwise untouched on a COD order). If the
 * claim is already taken we return success without moving money; if the gateway
 * rejects we release the claim so a retry can re-attempt.
 */
export async function refundCodAdvance(orderId: string): Promise<RefundOutcome> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, moved: false, amount: 0, error: "Order not found." };

  // Only COD orders with an actually-paid booking advance qualify. "PartiallyPaid"
  // means the advance cleared but the delivery balance hasn't been collected yet;
  // once the balance is collected the status is "Paid" and nothing is refunded here.
  const advanceRupees = Math.round(order.codAdvancePaise / 100);
  if (
    order.paymentMethod !== "COD" ||
    order.codAdvancePaise <= 0 ||
    order.paymentStatus !== "PartiallyPaid"
  ) {
    return { ok: true, moved: false, amount: 0 };
  }
  if (order.refundStatus === "Initiated" || order.refundStatus === "Completed") {
    return { ok: true, moved: false, amount: order.refundAmount || advanceRupees };
  }

  // Atomic claim — only the caller that flips "" → "Processing" owns the refund.
  const claim = await prisma.order.updateMany({
    where: { id: order.id, paymentMethod: "COD", refundStatus: "" },
    data: { refundStatus: "Processing" },
  });
  if (claim.count === 0) {
    // Another caller already claimed/sent it — log nothing, move no money.
    return { ok: true, moved: false, amount: order.refundAmount || advanceRupees };
  }

  const merchantRefundId = `RF-${order.orderNumber}-ADV-${Date.now().toString(36)}`;
  const res = await initiateRefund({
    merchantRefundId,
    merchantOrderId: order.orderNumber,
    amountPaise: order.codAdvancePaise,
  });
  if (!res.ok) {
    // Release the claim so the cancel can be retried without losing the refund.
    await prisma.order.updateMany({
      where: { id: order.id, refundStatus: "Processing" },
      data: { refundStatus: "" },
    });
    return { ok: false, moved: false, amount: advanceRupees, error: res.error };
  }
  await prisma.order.update({
    where: { id: order.id },
    data: {
      refundStatus: "Initiated",
      refundRef: merchantRefundId,
      refundAmount: advanceRupees,
    },
  });
  return { ok: true, moved: true, amount: advanceRupees };
}

export interface CancelOutcome {
  ok: boolean;
  note: string;
  error?: string;
}

/**
 * Cancel an order end-to-end: refund the customer's online payment, cancel the
 * Shiprocket shipment (which returns the freight to the wallet), then mark the
 * order Cancelled. The refund runs first — the part that can hard-fail — so a
 * gateway error leaves the order untouched and the caller can retry. Used by
 * both admin cancellation and customer self-cancellation.
 */
export async function cancelOrderEverywhere(orderId: string): Promise<CancelOutcome> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, note: "", error: "Order not found." };

  // 1) Refund the customer first. A prepaid PhonePe order returns its full
  // payment; a COD-advance order returns its booking advance. The two are
  // mutually exclusive by payment method, so at most one actually moves money —
  // standard COD / unpaid orders are a no-op and behave exactly as before.
  const r = await refundOrderPayment(orderId);
  if (!r.ok) {
    return { ok: false, note: "", error: r.error ?? "Couldn't start the refund." };
  }
  const ar = await refundCodAdvance(orderId);
  if (!ar.ok) {
    return { ok: false, note: "", error: ar.error ?? "Couldn't start the advance refund." };
  }

  // 2) Cancel the Shiprocket shipment (best-effort; refunds freight to wallet).
  if (order.shiprocketOrderId) {
    const c = await cancelShiprocketOrder({
      shiprocketOrderId: order.shiprocketOrderId,
      awb: order.awb || undefined,
    });
    if (c.ok) {
      await prisma.order.update({
        where: { id: orderId },
        data: { shipmentStatus: "Cancelled" },
      });
    }
  }

  // 3) Mark the order cancelled — CAS so the restock below runs exactly once and
  // never for an order already terminally settled elsewhere (e.g. an RTO set it
  // to "Returned" and already restocked via its own ledger key).
  const cancelled = await prisma.order.updateMany({
    where: { id: orderId, status: { notIn: ["Cancelled", "Returned", "Refunded"] } },
    data: { status: "Cancelled" },
  });

  // 4) Restore stock through the authoritative ledger. The idempotency key is the
  // SAME one releaseOrder uses, so an unpaid order that was already released and
  // is then cancelled can never be double-restocked.
  if (cancelled.count > 0) {
    let items: { id: string; qty: number }[] = [];
    try {
      items = JSON.parse(order.items);
    } catch {
      items = [];
    }
    for (const it of items) {
      if (!it?.id || !it?.qty) continue;
      await applyInventoryTxn({
        productId: it.id,
        delta: it.qty,
        type: "CANCEL_RESTOCK",
        orderId: order.id,
        reason: "Order cancelled",
        idempotencyKey: `${order.id}-cancel-${it.id}`,
      });
    }
  }

  // At most one of the two refunds actually moved money (prepaid full vs. COD
  // booking advance), so report whichever did.
  const refunded = r.moved ? r.amount : ar.moved ? ar.amount : 0;
  const note =
    r.moved || ar.moved
      ? `Order cancelled. Refund of ₹${refunded.toLocaleString("en-IN")} started to the original payment method.`
      : "Order cancelled.";
  return { ok: true, note };
}
