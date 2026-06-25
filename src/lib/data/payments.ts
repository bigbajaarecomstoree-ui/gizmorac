import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrderStatus, getRefundStatus } from "@/lib/phonepe";
import { logEvent } from "@/lib/data/logs";
import { applyInventoryTxn } from "@/lib/postorder/inventory";

/** Minimal order shape needed to release an unpaid order. */
export interface ReleasableOrder {
  id: string;
  orderNumber: string;
  items: string;
  couponCode: string | null;
  email: string;
}

/**
 * Idempotently release an unpaid PhonePe order: cancel it, restore stock through
 * the authoritative ledger, release the coupon hold, and close the line items.
 *
 * Concurrency-safe: a compare-and-swap claims the `Pending` row exactly once, so
 * only one runner (callback / webhook / cron) ever performs the restore — even
 * if all three fire at the same instant. Returns true only for the winner.
 */
export async function releaseOrder(
  order: ReleasableOrder,
  reason: string,
): Promise<boolean> {
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "Pending" },
    data: {
      status: "Cancelled",
      paymentStatus: "Failed",
      paymentError: reason,
      statusV2: "CANCELLED",
      paymentState: "FAILED",
    },
  });
  if (claimed.count === 0) return false; // already settled by another runner

  // Restore stock via the append-only ledger (idempotent per key → never drifts).
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
      reason,
      idempotencyKey: `${order.id}-cancel-${it.id}`,
    });
  }

  // Release the coupon hold taken at checkout (never below zero).
  if (order.couponCode) {
    await prisma.coupon.updateMany({
      where: { code: order.couponCode, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  // Close the v2 line items + write the audit row.
  await prisma.orderItem.updateMany({
    where: { orderId: order.id, status: "ACTIVE" },
    data: { status: "CLOSED" },
  });
  await prisma.orderStatusHistory.create({
    data: {
      entityType: "ORDER",
      entityId: order.id,
      orderId: order.id,
      previousState: "PENDING",
      newState: "CANCELLED",
      actorRole: "SYSTEM",
      reason,
    },
  });
  await logEvent({
    level: "warn",
    actor: "system",
    actorEmail: order.email,
    action: "order.released",
    message: `Released unpaid order ${order.orderNumber}: ${reason}`,
    meta: { orderNumber: order.orderNumber, reason },
  });
  revalidate(order.orderNumber);
  return true;
}

function revalidate(orderNumber: string) {
  revalidatePath(`/order/${orderNumber}`);
  revalidatePath("/account");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
}

export type Reconciled = "Paid" | "Failed" | "Pending" | "NotFound";

/**
 * Verify a PhonePe order's real status (server-side) and update it:
 *  - COMPLETED → Confirmed + Paid
 *  - FAILED    → Cancelled + Failed, stock restored
 *  - else      → left Pending
 * Idempotent: a second call after "Paid" is a no-op.
 */
export async function reconcilePhonePeOrder(
  orderNumber: string,
): Promise<Reconciled> {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return "NotFound";
  if (order.paymentStatus === "Paid") return "Paid";
  if (order.paymentStatus === "Failed") return "Failed"; // already settled — no API call

  const status = await getOrderStatus(orderNumber);
  if (status.state === "COMPLETED") {
    const expectedPaise = order.totalPaise ?? order.total * 100;
    // Defense in depth: the hosted flow fixes the amount we sent, but never mark
    // an order paid if the gateway reports a different figure than we billed.
    if (typeof status.amount === "number" && status.amount !== expectedPaise) {
      await logEvent({
        level: "error",
        actor: "system",
        actorEmail: order.email,
        action: "payment.amount_mismatch",
        message: `PhonePe amount mismatch for ${orderNumber}: charged ${status.amount}p, expected ${expectedPaise}p — left unconfirmed for manual review.`,
        meta: { orderNumber, charged: status.amount, expected: expectedPaise },
      });
      return "Pending";
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "Confirmed",
        paymentStatus: "Paid",
        paymentRef: status.reference || status.transactionId || order.paymentRef,
        paymentInstrument: status.instrument || order.paymentInstrument,
        // Keep the v2 state in sync so cancel/refund logic sees the payment.
        statusV2: "CONFIRMED",
        paymentState: "PAID",
        amountPaidPaise: expectedPaise,
      },
    });
    await logEvent({
      actor: "customer",
      actorEmail: order.email,
      action: "payment.paid",
      message: `Payment received for ${orderNumber} (PhonePe)`,
      meta: { orderNumber, transactionId: status.transactionId ?? "" },
    });
    revalidate(orderNumber);
    return "Paid";
  }
  if (status.state === "FAILED") {
    await releaseOrder(order, status.error || "Payment was not completed.");
    return "Failed";
  }
  return "Pending";
}

/**
 * Refresh an order's refund status from PhonePe. Safe to call repeatedly;
 * stops once the refund is Completed or Failed.
 */
export async function reconcileRefund(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.refundRef) return;
  if (order.refundStatus === "Completed" || order.refundStatus === "Failed") return;

  const { state } = await getRefundStatus(order.refundRef);
  if (state === "UNKNOWN" || state === order.refundStatus) return;

  await prisma.order.update({
    where: { id: order.id },
    data: { refundStatus: state },
  });
  if (state === "Completed" || state === "Failed") {
    await logEvent({
      actor: "system",
      action: `refund.${state.toLowerCase()}`,
      message: `Refund ${state.toLowerCase()} for ${order.orderNumber}`,
      meta: { orderNumber: order.orderNumber, refundRef: order.refundRef },
    });
  }
  revalidate(order.orderNumber);
}
