import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrderById, ORDER_STATUSES } from "@/lib/data/orders";
import { getOrderActivity } from "@/lib/data/logs";
import { getShiprocketConfig } from "@/lib/shiprocket";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { ShipmentPanel } from "@/components/admin/shipment-panel";
import { OrderActivity } from "@/components/admin/order-activity";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const shiprocket = await getShiprocketConfig();
  const activity = await getOrderActivity(order.orderNumber);

  const placed = new Date(order.createdAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-muted">Placed {placed}</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* items + activity */}
        <div className="min-w-0 space-y-5">
          {/* items + totals (compact) */}
          <div className="rounded-xl border border-border bg-surface">
            <h2 className="flex items-center justify-between border-b border-border px-5 py-3 text-sm font-semibold">
              <span>Items</span>
              <span className="font-normal text-muted">
                {order.items.reduce((n, it) => n + it.qty, 0)} unit
                {order.items.reduce((n, it) => n + it.qty, 0) === 1 ? "" : "s"}
              </span>
            </h2>
            <div className="divide-y divide-border">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${it.slug}`}
                      target="_blank"
                      className="line-clamp-1 text-sm font-medium hover:text-accent-bright"
                    >
                      {it.name}
                    </Link>
                    <div className="text-xs text-muted">
                      {formatINR(it.price)} × {it.qty}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatINR(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
            <dl className="space-y-1.5 border-t border-border px-5 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Discount</dt>
                  <dd>−{formatINR(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>Total</dt>
                <dd className="readout">{formatINR(order.total)}</dd>
              </div>
            </dl>
          </div>

          {/* activity timeline — every action performed on this order */}
          <OrderActivity events={activity} />
        </div>

        {/* customer + status */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">Update status</h2>
            <OrderStatusForm
              orderId={order.id}
              status={order.status}
              statuses={ORDER_STATUSES}
            />
          </div>

          <ShipmentPanel
            orderId={order.id}
            connected={shiprocket.configured}
            shiprocketOrderId={order.shiprocketOrderId}
            awb={order.awb}
            courier={order.courier}
            trackingUrl={order.trackingUrl}
            labelUrl={order.labelUrl}
            shipmentStatus={order.shipmentStatus}
            returnAwb={order.returnAwb}
            returnCourier={order.returnCourier}
            returnTrackingUrl={order.returnTrackingUrl}
            returnStatus={order.returnStatus}
            replacementAwb={order.replacementAwb}
            replacementCourier={order.replacementCourier}
            replacementTrackingUrl={order.replacementTrackingUrl}
            replacementLabelUrl={order.replacementLabelUrl}
            replacementStatus={order.replacementStatus}
          />

          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-3 font-semibold">Customer</h2>
            <p className="font-medium">{order.firstName} {order.lastName}</p>
            <p className="text-muted">{order.email}</p>
            <p className="text-muted">{order.phone}</p>
            <hr className="my-3 border-border" />
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Shipping</h3>
            <p className="text-muted">
              {order.address}, {order.city}, {order.state} — {order.pincode}
            </p>
            {order.gstin ? (
              <p className="mt-1 text-muted">
                {order.companyName ? `${order.companyName} · ` : ""}GSTIN: {order.gstin}
              </p>
            ) : null}
            <hr className="my-3 border-border" />
            <div className="flex justify-between">
              <span className="text-muted">Payment</span>
              <span className="font-medium">
                {order.paymentMethod === "PhonePe"
                  ? `${order.paymentInstrument || "PhonePe"} · ${order.paymentStatus || "Pending"}`
                  : "Cash on Delivery"}
              </span>
            </div>
            {order.paymentRef ? (
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-muted">Reference</span>
                <span className="font-mono">{order.paymentRef}</span>
              </div>
            ) : null}
            {order.refundStatus ? (
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-muted">Refund</span>
                <span
                  className={
                    order.refundStatus === "Completed"
                      ? "font-medium text-success"
                      : order.refundStatus === "Failed"
                        ? "font-medium text-danger"
                        : "font-medium text-accent"
                  }
                >
                  {formatINR(order.refundAmount)} · {order.refundStatus}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
