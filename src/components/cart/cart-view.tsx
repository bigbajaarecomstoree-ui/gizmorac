"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  ArrowRight,
  X,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
  Flame,
  Gift,
  CheckCircle2,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { buttonVariants } from "@/components/ui/button";
import { ProductArt } from "@/components/product/product-art";
import { ProductCard } from "@/components/product/product-card";
import { RatingStars } from "@/components/product/rating-stars";
import { PincodeChecker } from "@/components/product/pincode-checker";
import { formatINR, discountPercent, shortTitle } from "@/lib/format";
import { applyCoupon, getMyDeliveryEstimate } from "@/lib/storefront/actions";
import { COUPON_STORAGE_KEY, MAX_QTY } from "@/lib/checkout-shared";

const PAYMENTS = [
  { src: "/payments/visa.svg", alt: "Visa" },
  { src: "/payments/mastercard.svg", alt: "Mastercard" },
  { src: "/payments/upi.svg", alt: "UPI" },
];

/** Trust + payment reassurance shown under the checkout button. */
function CartTrust() {
  const items = [
    { icon: Lock, label: "Secure payment" },
    { icon: Truck, label: "Fast shipping" },
    { icon: RotateCcw, label: "Easy returns" },
    { icon: ShieldCheck, label: "Warranty" },
  ];
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-y-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2 text-xs font-medium text-foreground">
            <it.icon size={14} className="shrink-0 text-accent" />
            {it.label}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {PAYMENTS.map((p) => (
          <span key={p.alt} className="grid h-7 w-10 place-items-center rounded-md border border-border bg-surface px-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.alt} className="max-h-3.5 w-auto object-contain" />
          </span>
        ))}
        {["COD", "EMI", "PhonePe"].map((t) => (
          <span
            key={t}
            className="grid h-7 place-items-center rounded-md border border-accent-dim/50 bg-accent-soft px-2 text-[0.625rem] font-bold uppercase tracking-wide text-accent-bright"
          >
            {t}
          </span>
        ))}
      </div>
      <p className="flex items-center justify-center gap-1 text-[0.6875rem] text-faint">
        <Lock size={11} /> 256-bit SSL · 100% secure payments
      </p>
    </div>
  );
}

export function CartView({
  products,
  freeShippingThreshold = 999,
  shippingFee = 79,
}: {
  products: Product[];
  freeShippingThreshold?: number;
  shippingFee?: number;
}) {
  const { cart, setQty, removeFromCart, offer, mounted } = useStore();
  const [code, setCode] = React.useState("");
  const [coupon, setCoupon] = React.useState<{ code: string; off: number } | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Live per-pincode shipping (Shiprocket) for the signed-in customer's saved
  // address — the SAME fee checkout shows and the server charges. null = fee
  // unknown (guest / no saved pincode / unserviceable) → the summary says
  // "Calculated at checkout" instead of quoting a flat fee that then jumps.
  const [liveFee, setLiveFee] = React.useState<number | null>(null);
  const [feeChecked, setFeeChecked] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    getMyDeliveryEstimate()
      .then((r) => {
        if (!active) return;
        if (r?.ok && r.serviceable) {
          // Live courier freight; a 0 rate means "unknown" → flat fallback,
          // exactly like checkout and the server-side charge.
          setLiveFee(r.ratePaise > 0 ? Math.round(r.ratePaise / 100) : shippingFee);
        } else if (r && !r.ok) {
          // Signed in with an address but Shiprocket unreachable → the server
          // will charge the flat fee, so quote that.
          setLiveFee(shippingFee);
        }
        // r === null (guest/no pincode) or unserviceable → leave null.
        setFeeChecked(true);
      })
      .catch(() => {
        if (active) setFeeChecked(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const map = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  // Prune ghost lines: ids whose product no longer exists (hard-deleted) would
  // otherwise linger in localStorage and inflate the header cart count forever.
  // `products` is the full catalogue (incl. drafts), so unresolved = deleted.
  React.useEffect(() => {
    if (!mounted) return;
    cart
      .filter((l) => !map.has(l.id))
      .forEach((l) => removeFromCart(l.id));
  }, [mounted, cart, map, removeFromCart]);

  const lines = cart
    .map((l) => ({ product: map.get(l.id), qty: l.qty }))
    .filter((l): l is { product: Product; qty: number } => Boolean(l.product));

  const inCart = new Set(lines.map((l) => l.product.id));
  const recommended = products
    .filter((p) => !inCart.has(p.id) && p.stock > 0)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 4);

  // Re-validate the applied coupon whenever the lines change: the discount is
  // a server-computed rupee value for one specific cart, so qty edits/removals
  // would otherwise keep showing the stale amount (and a min-order coupon
  // could stay applied below its threshold). Checkout re-validates the same
  // way — this keeps the cart's numbers honest before that.
  const lineKey = lines.map((l) => `${l.product.id}:${l.qty}`).join(",");
  React.useEffect(() => {
    if (!coupon || lines.length === 0) return;
    let stale = false;
    const refs = lines.map((l) => ({ id: l.product.id, qty: l.qty }));
    applyCoupon(coupon.code, refs).then((res) => {
      if (stale) return;
      if (res.ok && res.discount) {
        setCoupon({ code: res.code ?? coupon.code, off: res.discount });
      } else {
        setCoupon(null);
        setCouponError(res.error ?? "This coupon no longer applies to your cart");
        try {
          localStorage.removeItem(COUPON_STORAGE_KEY);
        } catch {}
      }
    });
    return () => {
      stale = true;
    };
    // Keyed on the line contents only — re-running on `coupon` identity would
    // double-validate right after submitCoupon already validated this cart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey]);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-muted">Loading your cart…</div>;
  }

  if (lines.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <ShoppingBag size={36} className="text-faint" />
          <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Looks like you haven&apos;t added anything yet. Let&apos;s fix that.
          </p>
          <Link href="/shop" className={`${buttonVariants()} mt-6`}>
            Start shopping
            <ArrowRight size={16} />
          </Link>
        </div>
        {recommended.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-lg font-semibold">Trending right now</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recommended.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.product.mrp * l.qty, 0);
  const productDiscount = mrpTotal - subtotal;
  const couponDiscount = coupon ? coupon.off : 0;
  // Instant promo-popup discount stacks on the coupon (capped at the subtotal).
  const instantOff = offer
    ? Math.min(offer.amount, Math.max(0, subtotal - couponDiscount))
    : 0;
  const afterDiscount = Math.max(0, subtotal - couponDiscount - instantOff);
  // Shipping: free over the threshold; otherwise the live per-pincode courier
  // fee when we know it. null = unknown → "Calculated at checkout" (never quote
  // a flat number the checkout would then contradict).
  const freeShip = afterDiscount >= freeShippingThreshold;
  const shipping: number | null = freeShip ? 0 : liveFee;
  const total: number | null = shipping === null ? null : afterDiscount + shipping;
  // GST already included in the tax-inclusive prices shown — scaled by the
  // discount ratio so it reflects the tax inside the amount actually charged.
  const gstIncl = Math.round(
    lines.reduce((s, l) => {
      const rate = l.product.gstRate || 18;
      const inc = l.product.price * l.qty;
      return s + (inc - inc / (1 + rate / 100));
    }, 0) * (subtotal > 0 ? afterDiscount / subtotal : 0),
  );
  const savings = productDiscount + couponDiscount + instantOff;
  const freeShipGap = Math.max(0, freeShippingThreshold - afterDiscount);
  const freeShipPct = Math.min(100, Math.round((afterDiscount / freeShippingThreshold) * 100));

  function submitCoupon(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setCouponError(null);
    const refs = lines.map((l) => ({ id: l.product.id, qty: l.qty }));
    startTransition(async () => {
      const res = await applyCoupon(c, refs);
      if (res.ok && res.discount) {
        setCoupon({ code: res.code ?? c, off: res.discount });
        try {
          localStorage.setItem(COUPON_STORAGE_KEY, res.code ?? c);
        } catch {}
      } else {
        setCoupon(null);
        setCouponError(res.error ?? "Invalid coupon code");
      }
    });
  }

  function clearCoupon() {
    setCoupon(null);
    setCode("");
    setCouponError(null);
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* left: free-shipping nudge + lines + recommendations */}
        <div className="min-w-0">
          {/* free-shipping progress */}
          {!freeShip ? (
            <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3.5">
              <p className="flex items-center gap-2 text-sm text-foreground">
                <Gift size={16} className="shrink-0 text-accent" />
                Add <span className="font-bold text-accent">{formatINR(freeShipGap)}</span> more to unlock{" "}
                <span className="font-semibold">FREE shipping</span>
              </p>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
                <div
                  className="h-full rounded-full bg-success transition-[width] duration-700"
                  style={{ width: `${freeShipPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3.5 text-sm font-medium text-success">
              <CheckCircle2 size={16} className="shrink-0" /> You&apos;ve unlocked FREE shipping 🎉
            </div>
          )}

          {/* lines */}
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {lines.map(({ product, qty }) => {
              const off = discountPercent(product);
              const lowStock = product.stock > 0 && product.stock <= 10;
              // Same cap as the PDP stepper: never past stock or MAX_QTY.
              const maxQty = Math.max(1, Math.min(MAX_QTY, product.stock));
              return (
                <div key={product.id} className="flex gap-4 p-4">
                  <Link
                    href={`/product/${product.slug}`}
                    className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:h-32 sm:w-32"
                  >
                    {product.image ? (
                      <Image src={product.image} alt="" fill sizes="128px" className="object-cover" />
                    ) : (
                      <ProductArt art={product.art} glyphClassName="!h-[40%]" />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/product/${product.slug}`}
                        title={product.name}
                        className="line-clamp-2 text-sm font-semibold leading-snug hover:text-accent-bright"
                      >
                        {shortTitle(product.name)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${shortTitle(product.name)}`}
                        className="-mr-2 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-danger cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-1">
                      <RatingStars rating={product.rating} count={product.reviewCount} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck size={12} className="text-accent" /> Warranty
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Truck size={12} className="text-accent" /> Free shipping ₹{freeShippingThreshold}+
                      </span>
                      {lowStock ? (
                        <span className="inline-flex items-center gap-1 font-medium text-accent-bright">
                          <Flame size={12} className="text-danger" /> Only {product.stock} left
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="readout text-sm font-semibold">{formatINR(product.price)}</span>
                      {off > 0 ? (
                        <>
                          <span className="font-mono text-xs text-faint line-through">{formatINR(product.mrp)}</span>
                          <span className="text-xs font-semibold text-success">{off}% off</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => setQty(product.id, qty - 1)}
                          disabled={qty <= 1}
                          aria-label="Decrease quantity"
                          className="grid h-8 w-8 place-items-center text-muted transition-transform hover:text-foreground active:scale-90 cursor-pointer disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-mono text-sm tabular-nums">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(product.id, Math.min(qty + 1, maxQty))}
                          disabled={qty >= maxQty}
                          aria-label="Increase quantity"
                          className="grid h-8 w-8 place-items-center text-muted transition-transform hover:text-foreground active:scale-90 cursor-pointer disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">{formatINR(product.price * qty)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* recommendations — fill the space + raise AOV */}
          {recommended.length > 0 ? (
            <div className="mt-10">
              <h2 className="text-lg font-semibold">You may also like</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
                {recommended.slice(0, 3).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* right: sticky summary + trust + delivery */}
        <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          {/* coupon */}
          <div className="rounded-xl border border-border bg-surface p-4">
            {coupon ? (
              <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-medium text-success">
                  <Tag size={15} /> {coupon.code} applied
                </span>
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="text-faint hover:text-danger cursor-pointer"
                  aria-label="Remove coupon"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium text-foreground">Have a coupon?</p>
                <form onSubmit={submitCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                    />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Discount code"
                      aria-label="Coupon code"
                      className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm uppercase transition-colors placeholder:normal-case placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pending}
                    className="h-10 rounded-lg border border-border-bright px-4 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer"
                  >
                    {pending ? "…" : "Apply"}
                  </button>
                </form>
              </>
            )}
            {couponError ? (
              <p className="mt-2 text-xs text-danger" role="alert">{couponError}</p>
            ) : null}
          </div>

          {/* summary */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatINR(productDiscount > 0 ? mrpTotal : subtotal)}</dd>
              </div>
              {productDiscount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Product discount</dt>
                  <dd>−{formatINR(productDiscount)}</dd>
                </div>
              ) : null}
              {coupon ? (
                <div className="flex justify-between text-success">
                  <dt>Coupon ({coupon.code})</dt>
                  <dd>−{formatINR(coupon.off)}</dd>
                </div>
              ) : null}
              {instantOff > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Instant offer</dt>
                  <dd>−{formatINR(instantOff)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>
                  {shipping === 0 ? (
                    <span className="font-medium text-success">Free</span>
                  ) : shipping === null ? (
                    <span className="text-faint">
                      {feeChecked ? "Calculated at checkout" : "Calculating…"}
                    </span>
                  ) : (
                    formatINR(shipping)
                  )}
                </dd>
              </div>
              {!freeShip ? (
                <p className="-mt-1 text-xs text-faint">Free over ₹{freeShippingThreshold}</p>
              ) : null}
              <div className="mt-1 flex items-baseline justify-between border-t-2 border-border pt-3">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="readout text-xl font-bold text-accent">
                  {total === null ? `${formatINR(afterDiscount)} + shipping` : formatINR(total)}
                </dd>
              </div>
              <div className="flex justify-between text-xs text-faint">
                <dt>Includes GST</dt>
                <dd>{formatINR(gstIncl)}</dd>
              </div>
            </dl>

            {savings > 0 ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm font-semibold text-success">
                <span className="text-base">🎉</span>
                You&apos;re saving {formatINR(savings)} today
              </div>
            ) : null}

            <Link
              href="/checkout"
              className={`${buttonVariants({ size: "lg" })} mt-5 w-full transition-transform hover:-translate-y-0.5`}
            >
              <Lock size={16} /> Secure Checkout
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/shop"
              className="mt-3 block text-center text-sm font-medium text-muted transition-colors hover:text-accent"
            >
              ← Continue shopping
            </Link>
          </div>

          {/* delivery estimate */}
          <PincodeChecker />

          {/* trust + payments */}
          <CartTrust />
        </div>
      </div>

      {/* mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden print:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] text-faint">Total</p>
            <p className="readout text-lg font-bold leading-tight">
              {total === null ? `${formatINR(afterDiscount)} + ship.` : formatINR(total)}
            </p>
          </div>
          <Link href="/checkout" className={`${buttonVariants({ size: "lg" })} ml-auto`}>
            <Lock size={16} /> Secure Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
