import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrderById, ORDER_STATUSES } from "@/lib/data/orders";
import { updateOrderStatus } from "@/lib/admin/actions";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

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

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* items + totals */}
        <div className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3.5 font-semibold">Items</h2>
          <div className="divide-y divide-border">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/product/${it.slug}`}
                    target="_blank"
                    className="text-sm font-medium hover:text-accent-bright"
                  >
                    {it.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {formatINR(it.price)} × {it.qty}
                  </div>
                </div>
                <span className="text-sm font-semibold">{formatINR(it.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <dl className="space-y-2 border-t border-border px-5 py-4 text-sm">
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
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="readout">{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* customer + status */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">Update status</h2>
            <form action={updateOrderStatus} className="flex gap-2">
              <input type="hidden" name="id" value={order.id} />
              <Select
                key={order.status}
                name="status"
                defaultValue={order.status}
                options={ORDER_STATUSES.map((s) => ({ value: s, label: s }))}
                className="flex-1"
                triggerClassName="bg-background"
              />
              <Button type="submit" size="md">Save</Button>
            </form>
          </div>

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
              <span className="font-medium">{order.paymentMethod}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
