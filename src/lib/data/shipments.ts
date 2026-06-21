import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/data/logs";

/** Map a Shiprocket status label to our order status (only ever moves forward). */
export function orderStatusFromShipment(
  label: string,
  current: string,
): string | null {
  const s = (label || "").toLowerCase();
  if (s.includes("delivered")) return current === "Delivered" ? null : "Delivered";
  if (
    s.includes("transit") ||
    s.includes("out for delivery") ||
    s.includes("shipped") ||
    s.includes("dispatched") ||
    s.includes("picked")
  ) {
    return ["Pending", "Confirmed", "Packed"].includes(current) ? "Shipped" : null;
  }
  return null;
}

/**
 * Apply a shipment update to the matching order (by our order number or AWB).
 * Updates the shipment fields and advances order status when appropriate.
 */
export async function recordShipmentUpdate(input: {
  orderNumber?: string;
  awb?: string;
  status?: string;
  courier?: string;
  trackingUrl?: string;
}): Promise<boolean> {
  const order = input.orderNumber
    ? await prisma.order.findUnique({ where: { orderNumber: input.orderNumber } })
    : input.awb
      ? await prisma.order.findFirst({ where: { awb: input.awb } })
      : null;
  if (!order) return false;

  const next = input.status
    ? orderStatusFromShipment(input.status, order.status)
    : null;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      shipmentStatus: input.status || order.shipmentStatus,
      awb: input.awb || order.awb,
      courier: input.courier || order.courier,
      trackingUrl: input.trackingUrl || order.trackingUrl,
      ...(next ? { status: next } : {}),
    },
  });

  if (next) {
    await logEvent({
      actor: "system",
      action: `shipment.${next.toLowerCase()}`,
      message: `Order ${order.orderNumber} → ${next} (Shiprocket: ${input.status})`,
      meta: { orderNumber: order.orderNumber, awb: input.awb ?? order.awb },
    });
  }

  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/account");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.id}`);
  return true;
}
