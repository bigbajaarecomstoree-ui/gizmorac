import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/types";

const VARIANT: Record<OrderStatus, "surface" | "soft" | "success" | "danger"> = {
  Pending: "surface",
  Confirmed: "soft",
  Packed: "soft",
  Shipped: "soft",
  Delivered: "success",
  Cancelled: "danger",
  Returned: "danger",
  Replacement: "soft",
  Refunded: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status] ?? "surface"}>{status}</Badge>;
}
