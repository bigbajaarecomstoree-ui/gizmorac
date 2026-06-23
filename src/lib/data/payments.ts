import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrderStatus, getRefundStatus } from "@/lib/phonepe";
import { logEvent } from "@/lib/data/logs";

async function restoreStock(itemsJson: string) {
  let items: { id: string; qty: number }[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return;
  }
  for (const it of items) {
    await prisma.product
      .update({ where: { id: it.id }, data: { stock: { increment: it.qty } } })
      .catch(() => {});
  }
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

  const status = await getOrderStatus(orderNumber);
  if (status.state === "COMPLETED") {
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
        amountPaidPaise: order.totalPaise ?? order.total * 100,
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
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "Cancelled",
        paymentStatus: "Failed",
        paymentError: status.error || "Payment was not completed.",
        statusV2: "CANCELLED",
        paymentState: "FAILED",
      },
    });
    await restoreStock(order.items);
    await logEvent({
      level: "warn",
      actor: "customer",
      actorEmail: order.email,
      action: "payment.failed",
      message: `Payment failed/cancelled for ${orderNumber} (PhonePe)`,
      meta: { orderNumber },
    });
    revalidate(orderNumber);
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
