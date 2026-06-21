import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrderStatus } from "@/lib/phonepe";
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
        paymentRef: status.transactionId ?? order.paymentRef,
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
      data: { status: "Cancelled", paymentStatus: "Failed" },
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
