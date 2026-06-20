import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Package, Star, ShieldAlert, FileDown } from "lucide-react";
import { getOrderByNumber } from "@/lib/data/orders";
import { getReviewsForOrder } from "@/lib/data/customer-reviews";
import { getRewardForOrder } from "@/lib/data/rewards";
import { getTicketForOrder } from "@/lib/data/tickets";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatINR, deliveryWindow } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderTracker } from "@/components/order/order-tracker";
import { OrderItemReview } from "@/components/account/order-review";
import { RewardCouponCard } from "@/components/account/reward-coupon";
import { TicketPanel } from "@/components/account/ticket-panel";
import { buttonVariants } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/types";

type Params = Promise<{ orderNumber: string }>;

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const FLOW: OrderStatus[] = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered"];
const TERMINAL = ["Cancelled", "Returned", "Refunded"];

export default async function OrderPage({ params }: { params: Params }) {
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const customer = await getCurrentCustomer();
  const isOwner = Boolean(
    customer &&
      (customer.id === order.customerId ||
        customer.email.toLowerCase() === order.email.toLowerCase()),
  );

  const placed = new Date(order.createdAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isTerminal = TERMINAL.includes(order.status);
  const currentStep = FLOW.indexOf(order.status as OrderStatus);
  const isDelivered = order.status === "Delivered";

  // Post-delivery actions are owner-only.
  const [reviews, reward, ticket] =
    isOwner && isDelivered
      ? await Promise.all([
          getReviewsForOrder(order.id),
          getRewardForOrder(order.id),
          getTicketForOrder(order.id),
        ])
      : [new Map(), null, null];

  return (
    <div className="shell py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          ...(isOwner ? [{ label: "My account", href: "/account" }] : []),
          { label: order.orderNumber },
        ]}
      />

      <div className="mx-auto mt-6 max-w-3xl">
        {/* confirmation header */}
        <div className="rounded-2xl border border-border bg-surface p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 size={30} />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Thank you for your order!</h1>
          <p className="mt-1.5 text-sm text-muted">
            Order <span className="font-mono font-semibold text-foreground">{order.orderNumber}</span> · placed {placed}
          </p>
          <div className="mt-3 flex justify-center">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* status timeline */}
        <div className="mt-5 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-5 font-semibold">Order status</h2>
          {isTerminal ? (
            <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <XCircle size={18} />
              This order is {order.status.toLowerCase()}.
            </div>
          ) : (
            <OrderTracker currentStep={currentStep} />
          )}
          {!isTerminal ? (
            <p className="mt-5 text-sm text-muted">
              Estimated delivery:{" "}
              <span className="font-medium text-foreground">{deliveryWindow()}</span>
            </p>
          ) : null}
        </div>

        {/* items + totals */}
        <div className="mt-5 rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3.5 font-semibold">Items</h2>
          <div className="divide-y divide-border">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/product/${it.slug}`} className="text-sm font-medium hover:text-accent-bright">
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
                <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
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
            <div className="flex justify-between pt-1 text-xs text-muted">
              <dt>Payment</dt>
              <dd>{order.paymentMethod}</dd>
            </div>
          </dl>
        </div>

        {/* repeat-order reward — delivered orders, owner only */}
        {isOwner && isDelivered && reward ? (
          <div className="mt-5">
            <RewardCouponCard {...reward} />
          </div>
        ) : null}

        {/* rate & review — delivered orders, owner only */}
        {isOwner && isDelivered ? (
          <div className="mt-5 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-accent" />
              <h2 className="font-semibold">Rate &amp; review your items</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Tell us how it went — your rating and feedback appear on the product page.
            </p>
            <div className="mt-4 space-y-3">
              {order.items.map((it) => {
                const r = reviews.get(it.id);
                return (
                  <OrderItemReview
                    key={it.id}
                    orderNumber={order.orderNumber}
                    productId={it.id}
                    productName={it.name}
                    existing={
                      r ? { rating: r.rating, title: r.title, body: r.body } : null
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {/* support — raise / track a damage or defect ticket (delivered, owner) */}
        {isOwner && isDelivered ? (
          <div className="mt-5 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-danger" />
              <h2 className="font-semibold">Need help with this order?</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Item damaged or defective? Raise a ticket and our team will help with a
              refund, replacement or warranty claim.
            </p>
            <div className="mt-4">
              <TicketPanel orderNumber={order.orderNumber} ticket={ticket} />
            </div>
          </div>
        ) : null}

        {/* shipping — full details only for the owner */}
        <div className="mt-5 rounded-xl border border-border bg-surface p-5 text-sm">
          <h2 className="mb-3 font-semibold">Shipping</h2>
          {isOwner ? (
            <>
              <p className="font-medium">{order.firstName} {order.lastName}</p>
              <p className="text-muted">{order.phone}</p>
              <p className="mt-1 text-muted">
                {order.address}, {order.city}, {order.state} — {order.pincode}
              </p>
            </>
          ) : (
            <>
              <p className="text-muted">
                Shipping to {order.city}, {order.state}.
              </p>
              <p className="mt-2 text-xs text-faint">
                <Link href="/login" className="text-accent-bright hover:text-accent">
                  Log in
                </Link>{" "}
                with this order&apos;s email to see full delivery details.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
            <Package size={16} /> Continue shopping
          </Link>
          {isOwner ? (
            <>
              <a
                href={`/api/account/invoice/${order.orderNumber}`}
                className={buttonVariants({ variant: "outline" })}
                download
              >
                <FileDown size={16} /> Download invoice
              </a>
              <Link href="/account" className={buttonVariants()}>
                View all orders
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
