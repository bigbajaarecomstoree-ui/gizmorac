import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Package, Star, ShieldAlert, FileDown, RotateCcw, Truck } from "lucide-react";
import { getOrderByNumber } from "@/lib/data/orders";
import { getAllProducts } from "@/lib/data/queries";
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
import { ResumePayment } from "@/components/order/resume-payment";
import { BuyAgainButton } from "@/components/account/buy-again";
import { TicketPanel } from "@/components/account/ticket-panel";
import { OrderActions } from "@/components/account/order-actions";
import { canCancelOrder, isDisputeWindowOpen, warrantyClaimOpen } from "@/lib/orders-policy";
import { buttonVariants } from "@/components/ui/button";
import { TrackPurchase } from "@/components/analytics/track-event";
import type { OrderStatus } from "@/lib/types";

type Params = Promise<{ orderNumber: string }>;

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const FLOW: OrderStatus[] = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered"];
const TERMINAL = ["Cancelled", "Returned", "Refunded"];

/** Turn a PhonePe error code into a plain-English reason. */
function friendlyPayError(code: string): string {
  if (!code) return "The payment was cancelled or didn't complete.";
  const c = code.toUpperCase();
  if (c.includes("DECLINE")) return "Your bank declined the payment.";
  if (c.includes("TIMEOUT") || c.includes("EXPIRE")) return "The payment timed out.";
  if (c.includes("CANCEL")) return "The payment was cancelled.";
  if (c.includes("INSUFFICIENT")) return "Insufficient balance.";
  if (code.includes(" ")) return code; // already a sentence
  return "The payment didn't complete.";
}

export default async function OrderPage({ params }: { params: Params }) {
  const { orderNumber: rawParam } = await params;
  // The link may be the bare number (GZ-123456 — owner-only) or carry the public
  // tracking token (GZ-123456-AB12CD34 — works for guests who got the email link).
  const m = /^(GZ-\d{6})(?:-([A-Za-z0-9]+))?$/.exec(rawParam);
  const orderNumber = m?.[1] ?? rawParam;
  const urlToken = m?.[2] ?? "";

  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const customer = await getCurrentCustomer();
  const isOwner = Boolean(
    customer &&
      (customer.id === order.customerId ||
        customer.email.toLowerCase() === order.email.toLowerCase()),
  );
  const tokenOk = order.trackingToken !== "" && urlToken === order.trackingToken;
  // Neither the signed-in owner nor a valid token → reveal nothing. This stops
  // anyone from enumerating order numbers to harvest order data.
  if (!tokenOk && !isOwner) notFound();
  const canView = isOwner || tokenOk;

  const placed = new Date(order.createdAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
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

  // Warranty eligibility: any item under an in-window manufacturer warranty?
  let canWarranty = false;
  if (isOwner && isDelivered) {
    const allProducts = await getAllProducts();
    const warrantyById = new Map(allProducts.map((p) => [p.id, p.warrantyMonths]));
    const maxWarranty = Math.max(0, ...order.items.map((i) => warrantyById.get(i.id) ?? 0));
    canWarranty = warrantyClaimOpen(order.status, order.deliveredAt, maxWarranty);
  }

  const isPlaced = ["Confirmed", "Packed", "Shipped", "Delivered"].includes(order.status);

  return (
    <div className="shell py-8">
      {isPlaced ? (
        <TrackPurchase
          orderNumber={order.orderNumber}
          value={order.total}
          items={order.items.map((i) => ({
            item_id: i.id,
            item_name: i.name,
            price: i.price,
            quantity: i.qty,
          }))}
        />
      ) : null}
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

        {/* customer actions */}
        {isOwner ? (
          <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3.5">
            <OrderActions
              orderNumber={order.orderNumber}
              items={order.items.map((i) => ({ id: i.id, qty: i.qty }))}
              canCancel={canCancelOrder(order.status)}
              canDispute={isDisputeWindowOpen(order.status, order.deliveredAt)}
              canWarranty={canWarranty}
              hasOpenTicket={Boolean(ticket)}
              showTrack={false}
            />
          </div>
        ) : null}

        {/* online payment status */}
        {order.paymentMethod === "PhonePe" ? (
          <div className="mt-5 space-y-3">
            {order.paymentStatus === "Paid" ? (
              <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-success">
                  <CheckCircle2 size={18} /> Payment successful — paid via{" "}
                  {order.paymentInstrument || "PhonePe"}.
                </p>
                {order.paymentRef ? (
                  <p className="mt-1 pl-7 text-xs text-muted">
                    Reference:{" "}
                    <span className="font-mono text-foreground">{order.paymentRef}</span>
                  </p>
                ) : null}
              </div>
            ) : order.paymentStatus === "Failed" ? (
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-danger">
                  <XCircle size={18} /> Payment didn&apos;t go through.
                </p>
                <p className="mt-1 pl-7 text-xs text-muted">
                  {friendlyPayError(order.paymentError)} No money was deducted — you can
                  place the order again.
                </p>
                {isOwner ? (
                  <div className="mt-3 pl-7">
                    <BuyAgainButton
                      items={order.items.map((i) => ({ id: i.id, qty: i.qty }))}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-accent/40 bg-accent-soft/40 px-4 py-3 text-sm">
                <p className="font-medium text-accent-bright">
                  Payment pending — complete your payment to confirm this order.
                </p>
                {isOwner ? (
                  <div className="mt-3">
                    <ResumePayment orderNumber={order.orderNumber} />
                  </div>
                ) : null}
              </div>
            )}

            {/* refund tracking */}
            {order.refundStatus ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  order.refundStatus === "Completed"
                    ? "border-success/30 bg-success/5"
                    : order.refundStatus === "Failed"
                      ? "border-danger/30 bg-danger/5"
                      : "border-border bg-surface"
                }`}
              >
                <p className="flex items-center gap-2 font-medium">
                  <RotateCcw
                    size={16}
                    className={
                      order.refundStatus === "Completed"
                        ? "text-success"
                        : order.refundStatus === "Failed"
                          ? "text-danger"
                          : "text-accent"
                    }
                  />
                  {order.refundStatus === "Completed"
                    ? `Refund of ${formatINR(order.refundAmount)} completed.`
                    : order.refundStatus === "Failed"
                      ? `Refund of ${formatINR(order.refundAmount)} couldn't be processed — our team will reach out.`
                      : `Refund of ${formatINR(order.refundAmount)} initiated — it usually reaches your account in 3–5 business days.`}
                </p>
                {order.refundRef ? (
                  <p className="mt-1 pl-6 text-xs text-muted">
                    Refund ref:{" "}
                    <span className="font-mono text-foreground">{order.refundRef}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

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

          {/* shipment tracking */}
          {order.trackingUrl || order.awb ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
              <div className="text-sm">
                <p className="font-medium">
                  {order.courier ? `Shipped via ${order.courier}` : "Shipment created"}
                  {order.shipmentStatus ? (
                    <span className="text-muted"> · {order.shipmentStatus}</span>
                  ) : null}
                </p>
                {order.awb ? (
                  <p className="mt-0.5 text-xs text-muted">
                    AWB: <span className="font-mono text-foreground">{order.awb}</span>
                  </p>
                ) : null}
              </div>
              {order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Truck size={15} /> Track shipment
                </a>
              ) : null}
            </div>
          ) : null}

          {/* replacement tracking */}
          {order.replacementAwb || order.returnAwb ? (
            <div className="mt-5 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <RotateCcw size={15} className="text-accent" /> Replacement in progress
              </p>
              {order.returnAwb ? (
                <p className="mt-1.5 text-xs text-muted">
                  We&rsquo;ve scheduled a pickup to collect the original item
                  {order.returnCourier ? ` (${order.returnCourier})` : ""}.
                </p>
              ) : null}
              {order.replacementAwb ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    New shipment{order.replacementCourier ? ` via ${order.replacementCourier}` : ""} · AWB{" "}
                    <span className="font-mono text-foreground">{order.replacementAwb}</span>
                  </p>
                  {order.replacementTrackingUrl ? (
                    <a
                      href={order.replacementTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Truck size={15} /> Track replacement
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
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
            {order.discount - order.instantDiscount > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                <dd>−{formatINR(order.discount - order.instantDiscount)}</dd>
              </div>
            ) : null}
            {order.instantDiscount > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Instant offer</dt>
                <dd>−{formatINR(order.instantDiscount)}</dd>
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
              <dd>
                {order.paymentMethod === "PhonePe"
                  ? `PhonePe · ${order.paymentStatus || "Pending"}`
                  : "Cash on Delivery"}
              </dd>
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
          <div className="relative mt-5">
            <span id="warranty-claim" className="absolute -top-24" aria-hidden />
            <div id="raise-dispute" className="scroll-mt-24 rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-danger" />
                <h2 className="font-semibold">Need help with this order?</h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                Item damaged or defective{canWarranty ? ", or making a warranty claim" : ""}?
                Raise a ticket and our team will help with a refund, replacement or warranty
                claim.
              </p>
              <div className="mt-4">
                <TicketPanel
                  orderNumber={order.orderNumber}
                  ticket={ticket}
                  allowWarranty={canWarranty}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* shipping — full details only for the owner */}
        <div className="mt-5 rounded-xl border border-border bg-surface p-5 text-sm">
          <h2 className="mb-3 font-semibold">Shipping</h2>
          {canView ? (
            <>
              <p className="font-medium">{order.firstName} {order.lastName}</p>
              <p className="text-muted">{order.phone}</p>
              <p className="mt-1 text-muted">
                {order.address}, {order.city}, {order.state} — {order.pincode}
              </p>
              {order.gstin ? (
                <p className="mt-1 text-muted">
                  {order.companyName ? `${order.companyName} · ` : ""}GSTIN: {order.gstin}
                </p>
              ) : null}
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
