import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, ShoppingBag, CreditCard, CalendarClock, IndianRupee, TrendingUp, Users, ShieldAlert, ChevronRight } from "lucide-react";
import { getOrderById, ORDER_STATUSES } from "@/lib/data/orders";
import { getOrderActivity } from "@/lib/data/logs";
import { getShiprocketConfig } from "@/lib/shiprocket";
import { prisma } from "@/lib/prisma";
import { formatINR, shortTitle } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { OrderOperations } from "@/components/admin/order-operations";
import { AdminOrderActions } from "@/components/admin/admin-order-actions";
import { AdminNotes } from "@/components/admin/admin-notes";
import { ShipmentPanel } from "@/components/admin/shipment-panel";
import { CodPanel } from "@/components/admin/cod-panel";
import { OrderActivity } from "@/components/admin/order-activity";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const shiprocket = await getShiprocketConfig();
  const activity = await getOrderActivity(order.orderNumber);

  // Post-order v2 (item-level) admin surface — shown when the read-switch is on.
  const setting = await prisma.storeSetting.findFirst({ select: { ffPostOrderV2: true } });
  const v2 = setting?.ffPostOrderV2 ?? false;
  const v2Order = v2 ? await prisma.order.findUnique({ where: { id }, select: { statusV2: true } }) : null;
  const v2Items = v2
    ? await prisma.orderItem.findMany({
        where: { orderId: id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, qty: true, status: true, netPaidPaise: true, returnReason: true },
      })
    : [];

  // Product thumbnails + cost for the order's items.
  const imgRows = await prisma.product.findMany({
    where: { id: { in: order.items.map((i) => i.id) } },
    select: { id: true, image: true, cost: true },
  });
  const imageById = new Map(imgRows.map((p) => [p.id, p.image]));
  const costById = new Map(imgRows.map((p) => [p.id, p.cost]));

  // Internal notes + profit (admin only).
  const orderRow = await prisma.order.findUnique({ where: { id }, select: { adminNotes: true } });
  const adminNotes = orderRow?.adminNotes ?? "";
  const cogs = order.items.reduce((s, it) => s + (costById.get(it.id) ?? 0) * it.qty, 0);
  const grossProfit = order.total - cogs;
  const margin = order.total ? Math.round((grossProfit / order.total) * 100) : 0;
  // Margin health: ≥20% healthy (green), 10–19% thin (amber), <10% bad (red).
  const marginColor =
    cogs === 0 ? "text-muted" : margin < 10 ? "text-red-600" : margin < 20 ? "text-amber-600" : "text-emerald-600";

  // Customer lifetime value + risk signals (matched by email — covers guest + registered).
  const custOrders = await prisma.order.findMany({
    where: { email: order.email },
    select: { total: true, status: true, paymentMethod: true },
  });
  const NON_REV = ["Cancelled", "Returned", "Refunded"];
  const revOrders = custOrders.filter((o) => !NON_REV.includes(o.status));
  const clvSpent = revOrders.reduce((s, o) => s + o.total, 0);
  const clvAov = revOrders.length ? Math.round(clvSpent / revOrders.length) : 0;
  const cancels = custOrders.filter((o) => o.status === "Cancelled").length;
  const returnsCount = custOrders.filter((o) => o.status === "Returned" || o.status === "Refunded").length;
  const returnRate = custOrders.length ? Math.round((returnsCount / custOrders.length) * 100) : 0;
  const codCount = custOrders.filter((o) => o.paymentMethod !== "PhonePe").length;
  const highRisk = cancels >= 3 || returnRate >= 40;
  // Registered-customer record (if any) so the lifetime card can open full history.
  const customerRecord = await prisma.customer.findFirst({
    where: { email: order.email },
    select: { id: true },
  });

  const v2Status = v2Order?.statusV2 ?? "PENDING";
  const canCancel = ["PENDING", "CONFIRMED", "PROCESSING"].includes(v2Status);
  const canMarkDelivered = ["SHIPPED", "OUT_FOR_DELIVERY"].includes(v2Status);
  const itemCount = order.items.reduce((n, it) => n + it.qty, 0);
  const paymentLabel =
    order.paymentMethod === "PhonePe"
      ? `${order.paymentInstrument || "UPI"} · ${order.paymentStatus || "Pending"}`
      : "Cash on Delivery";

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

      {/* order header — identity + key facts + admin actions */}
      <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-faint">Placed {placed}</p>
          </div>
          <AdminOrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            email={order.email}
            phone={order.phone}
            canCancel={canCancel}
            canMarkDelivered={canMarkDelivered}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <div className="tech-label flex items-center gap-1.5"><IndianRupee size={12} /> Total</div>
            <div className="readout mt-0.5 text-lg font-bold">{formatINR(order.total)}</div>
          </div>
          <div>
            <div className="tech-label flex items-center gap-1.5"><CreditCard size={12} /> Payment</div>
            <div className="mt-0.5 text-sm font-semibold">{paymentLabel}</div>
          </div>
          <div>
            <div className="tech-label flex items-center gap-1.5"><ShoppingBag size={12} /> Items</div>
            <div className="mt-0.5 text-sm font-semibold">{itemCount} unit{itemCount === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="tech-label flex items-center gap-1.5"><CalendarClock size={12} /> Customer</div>
            <div className="mt-0.5 truncate text-sm font-semibold">{order.firstName} {order.lastName}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* items + activity */}
        <div className="min-w-0 space-y-5">
          {/* item-level operations (post-order v2) */}
          {v2 ? (
            <OrderOperations
              orderId={order.id}
              orderStatus={v2Order?.statusV2 ?? "PENDING"}
              items={v2Items.map((i) => ({
                id: i.id,
                name: i.name,
                qty: i.qty,
                status: i.status,
                netPaidPaise: i.netPaidPaise,
                returnReason: i.returnReason,
              }))}
            />
          ) : null}

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
              {order.items.map((it) => {
                const img = imageById.get(it.id);
                return (
                  <div key={it.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-[60px] w-[60px] shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package size={20} className="text-faint" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${it.slug}`}
                        target="_blank"
                        title={it.name}
                        className="line-clamp-2 text-sm font-medium hover:text-accent-bright"
                      >
                        {shortTitle(it.name)}
                      </Link>
                      <div className="text-xs text-muted">
                        {formatINR(it.price)} × {it.qty}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{formatINR(it.price * it.qty)}</span>
                  </div>
                );
              })}
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
          {!v2 ? (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 font-semibold">Update status</h2>
              <OrderStatusForm
                orderId={order.id}
                status={order.status}
                statuses={ORDER_STATUSES}
              />
            </div>
          ) : null}

          <ShipmentPanel
            orderId={order.id}
            connected={shiprocket.configured}
            shiprocketOrderId={order.shiprocketOrderId}
            awb={order.awb}
            courier={order.courier}
            trackingUrl={order.trackingUrl}
            labelUrl={order.labelUrl}
            shipmentStatus={order.shipmentStatus}
            shipmentCostPaise={order.shipmentCostPaise}
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

          {order.paymentMethod === "COD" ? (
            <CodPanel
              orderId={order.id}
              total={order.total}
              codAdvancePaise={order.codAdvancePaise}
              codRemainingPaise={order.codRemainingPaise}
              paymentStatus={order.paymentStatus}
              deliveryPaymentStatus={order.deliveryPaymentStatus}
              rtoStatus={order.rtoStatus}
            />
          ) : null}

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

          {/* customer lifetime + risk signals (V2) — links to full history */}
          {(() => {
            const inner = (
              <>
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <Users size={16} className="text-accent" /> Customer lifetime
                  {highRisk ? (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                      <ShieldAlert size={12} /> High risk
                    </span>
                  ) : null}
                </h2>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-surface-2 px-2 py-2">
                    <div className="text-base font-bold">{custOrders.length}</div>
                    <div className="tech-label">Orders</div>
                  </div>
                  <div className="rounded-lg bg-surface-2 px-2 py-2">
                    <div className="text-base font-bold">{formatINR(clvSpent)}</div>
                    <div className="tech-label">Spent</div>
                  </div>
                  <div className="rounded-lg bg-surface-2 px-2 py-2">
                    <div className="text-base font-bold">{formatINR(clvAov)}</div>
                    <div className="tech-label">AOV</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{cancels} cancelled</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{returnRate}% return rate</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{codCount} COD</span>
                </div>
              </>
            );
            return customerRecord ? (
              <Link
                href={`/admin/customers/${customerRecord.id}`}
                className="block rounded-xl border border-border bg-surface p-5 text-sm transition-colors hover:border-accent"
              >
                {inner}
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2.5 text-xs font-semibold text-accent">
                  View order history <ChevronRight size={13} />
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-5 text-sm">
                {inner}
                <p className="mt-3 border-t border-border pt-2.5 text-xs text-faint">Guest checkout — no customer account.</p>
              </div>
            );
          })()}

          {/* profit (internal, admin only) */}
          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp size={16} className="text-accent" /> Profit
              <span className="text-xs font-normal text-faint">· internal</span>
            </h2>
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted">Selling</dt>
                <dd>{formatINR(order.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Product cost</dt>
                <dd>−{formatINR(cogs)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <dt>Gross profit</dt>
                <dd className={marginColor}>
                  {formatINR(grossProfit)} · {margin}%
                </dd>
              </div>
            </dl>
            {cogs === 0 ? (
              <p className="mt-2 text-xs text-faint">Set a product cost in Products to see true margin.</p>
            ) : null}
          </div>

          <AdminNotes orderId={order.id} initial={adminNotes} />
        </div>
      </div>
    </div>
  );
}
