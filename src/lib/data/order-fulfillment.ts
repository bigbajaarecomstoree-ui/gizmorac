// Shared order money/logistics operations used by both the admin actions and
// the customer-facing order actions. Server-only (touches the DB + gateways).

import { prisma } from "@/lib/prisma";
import { initiateRefund } from "@/lib/phonepe";
import { cancelShiprocketOrder } from "@/lib/shiprocket";

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

  const merchantRefundId = `RF-${order.orderNumber}-${Date.now().toString(36)}`;
  const res = await initiateRefund({
    merchantRefundId,
    merchantOrderId: order.orderNumber,
    amountPaise: order.total * 100,
  });
  if (!res.ok) {
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

  // 1) Refund the customer first.
  const r = await refundOrderPayment(orderId);
  if (!r.ok) {
    return { ok: false, note: "", error: r.error ?? "Couldn't start the refund." };
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

  // 3) Mark the order cancelled.
  await prisma.order.update({ where: { id: orderId }, data: { status: "Cancelled" } });

  const note = r.moved
    ? `Order cancelled. Refund of ₹${r.amount.toLocaleString("en-IN")} started to the original payment method.`
    : "Order cancelled.";
  return { ok: true, note };
}
