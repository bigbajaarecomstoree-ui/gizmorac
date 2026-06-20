import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrderStatus } from "@/lib/phonepe";

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
    revalidate(orderNumber);
    return "Paid";
  }
  if (status.state === "FAILED") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "Cancelled", paymentStatus: "Failed" },
    });
    await restoreStock(order.items);
    revalidate(orderNumber);
    return "Failed";
  }
  return "Pending";
}
