"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { buttonVariants } from "@/components/ui/button";
import { ProductArt } from "@/components/product/product-art";
import { formatINR, discountPercent, shortTitle } from "@/lib/format";
import { applyCoupon } from "@/lib/storefront/actions";
import { COUPON_STORAGE_KEY, MAX_QTY } from "@/lib/checkout-shared";

export function CartView({
  products,
  freeShippingThreshold = 999,
  shippingFee = 79,
}: {
  products: Product[];
  freeShippingThreshold?: number;
  shippingFee?: number;
}) {
  const { cart, setQty, removeFromCart } = useStore();
  const { mounted } = useStore();
  const [code, setCode] = React.useState("");
  const [coupon, setCoupon] = React.useState<{ code: string; off: number } | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const map = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const lines = cart
    .map((l) => ({ product: map.get(l.id), qty: l.qty }))
    .filter((l): l is { product: Product; qty: number } => Boolean(l.product));

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-muted">Loading your cart…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-20 text-center">
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
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + l.product.mrp * l.qty, 0);
  const productDiscount = mrpTotal - subtotal;
  const couponDiscount = coupon ? coupon.off : 0;
  const afterCoupon = Math.max(0, subtotal - couponDiscount);
  const shipping = afterCoupon >= freeShippingThreshold ? 0 : shippingFee;
  const total = afterCoupon + shipping;

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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      {/* lines */}
      <div className="divide-y divide-border self-start overflow-hidden rounded-xl border border-border bg-surface">
        {lines.map(({ product, qty }) => {
          const off = discountPercent(product);
          return (
            <div key={product.id} className="flex gap-4 p-4">
              <Link
                href={`/product/${product.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border"
              >
                <ProductArt art={product.art} glyphClassName="!h-[40%]" />
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
                    className="shrink-0 text-faint transition-colors hover:text-danger cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-1 flex items-baseline gap-2">
                  <span className="readout text-sm font-semibold">
                    {formatINR(product.price)}
                  </span>
                  {off > 0 ? (
                    <span className="font-mono text-xs text-faint line-through">
                      {formatINR(product.mrp)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setQty(product.id, qty - 1)}
                      aria-label="Decrease quantity"
                      className="grid h-8 w-8 place-items-center text-muted hover:text-foreground cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-mono text-sm tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(product.id, Math.min(qty + 1, MAX_QTY))}
                      aria-label="Increase quantity"
                      className="grid h-8 w-8 place-items-center text-muted hover:text-foreground cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatINR(product.price * qty)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* summary */}
      <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
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
            <form onSubmit={submitCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm uppercase placeholder:normal-case placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-lg border border-border-bright px-4 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer"
              >
                {pending ? "…" : "Apply"}
              </button>
            </form>
          )}
          {couponError ? (
            <p className="mt-2 text-xs text-danger" role="alert">{couponError}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatINR(subtotal)}</dd>
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
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="readout">{formatINR(total)}</dd>
            </div>
          </dl>

          <Link href="/checkout" className={`${buttonVariants({ size: "lg" })} mt-5 w-full`}>
            Proceed to Checkout
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/shop"
            className={`${buttonVariants({ variant: "surface" })} mt-3 w-full`}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
