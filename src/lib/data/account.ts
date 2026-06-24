import { prisma } from "@/lib/prisma";

export interface ActivityEvent {
  id: string;
  orderNumber: string;
  label: string;
  createdAt: string;
  tone: "neutral" | "good" | "bad" | "warn";
}

const LABEL: Record<string, { label: string; tone: ActivityEvent["tone"] }> = {
  CONFIRMED: { label: "Order confirmed", tone: "neutral" },
  PROCESSING: { label: "Order processing", tone: "neutral" },
  PACKED: { label: "Packed for dispatch", tone: "neutral" },
  SHIPPED: { label: "Shipped", tone: "good" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", tone: "good" },
  DELIVERED: { label: "Delivered", tone: "good" },
  CANCELLED: { label: "Order cancelled", tone: "bad" },
  RETURNED: { label: "Returned", tone: "warn" },
  REFUNDED: { label: "Refund processed", tone: "warn" },
  REPLACEMENT: { label: "Replacement issued", tone: "warn" },
};

/** Recent activity across a customer's orders — placements + status changes. */
export async function getCustomerActivity(
  orders: { id: string; orderNumber: string; createdAt: string }[],
  limit = 8,
): Promise<ActivityEvent[]> {
  if (orders.length === 0) return [];
  const byId = new Map(orders.map((o) => [o.id, o.orderNumber]));

  const rows = await prisma.orderStatusHistory.findMany({
    where: { entityType: "ORDER", orderId: { in: orders.map((o) => o.id) } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, orderId: true, newState: true, createdAt: true },
  });

  const fromHistory: ActivityEvent[] = rows
    .filter((r) => LABEL[r.newState])
    .map((r) => ({
      id: r.id,
      orderNumber: byId.get(r.orderId ?? "") ?? "",
      label: LABEL[r.newState].label,
      tone: LABEL[r.newState].tone,
      createdAt: r.createdAt.toISOString(),
    }));

  const placed: ActivityEvent[] = orders.map((o) => ({
    id: `placed-${o.id}`,
    orderNumber: o.orderNumber,
    label: "Order placed",
    tone: "neutral",
    createdAt: o.createdAt,
  }));

  return [...fromHistory, ...placed]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}
