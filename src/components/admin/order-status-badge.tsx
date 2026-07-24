import type { OrderStatus } from "@/lib/types";

// Stronger, distinct per-status colors (tinted chip + bold text, readable in
// light & dark). Pending→amber, Delivered→green, Cancelled→red,
// Returned→orange, Refunded→purple.
const STYLE: Record<OrderStatus, string> = {
  Pending: "bg-amber-500/15 text-amber-600 border-amber-500/35",
  Confirmed: "bg-blue-500/15 text-blue-600 border-blue-500/35",
  Packed: "bg-indigo-500/15 text-indigo-600 border-indigo-500/35",
  Shipped: "bg-sky-500/15 text-sky-600 border-sky-500/35",
  Delivered: "bg-emerald-500/15 text-emerald-600 border-emerald-500/35",
  Cancelled: "bg-red-500/15 text-red-600 border-red-500/35",
  Returned: "bg-orange-500/15 text-orange-600 border-orange-500/40",
  Replacement: "bg-teal-500/15 text-teal-600 border-teal-500/35",
  Refunded: "bg-purple-500/15 text-purple-600 border-purple-500/35",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold leading-none ${
        STYLE[status] ?? "bg-surface-2 text-muted border-border"
      }`}
    >
      {status}
    </span>
  );
}

// Active-RTO companion chip. The order status stays "Shipped" while a parcel
// is coming back (it only becomes "Returned" once the admin confirms receipt),
// so lists and headers pair the status badge with this chip to carry the
// courier reality. Renders nothing for NONE / RTO_RECEIVED.
const RTO_ADMIN: Record<string, string> = {
  DELIVERY_FAILED: "Delivery failed",
  RTO_INITIATED: "RTO",
};
const RTO_CUSTOMER: Record<string, string> = {
  DELIVERY_FAILED: "Delivery failed",
  RTO_INITIATED: "Returning",
};

export function RtoBadge({
  rtoStatus,
  customerFacing = false,
}: {
  rtoStatus: string;
  customerFacing?: boolean;
}) {
  const label = (customerFacing ? RTO_CUSTOMER : RTO_ADMIN)[rtoStatus];
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-red-500/35 bg-red-500/15 px-2.5 py-1 text-[0.6875rem] font-semibold leading-none text-red-600">
      {label}
    </span>
  );
}
