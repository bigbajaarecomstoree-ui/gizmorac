"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShoppingBag, Tag, X } from "lucide-react";
import type { Customer, Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { ProductArt } from "@/components/product/product-art";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatINR, shortTitle } from "@/lib/format";
import { applyCoupon, placeOrder } from "@/lib/storefront/actions";
import { COUPON_STORAGE_KEY } from "@/lib/checkout-shared";
import { INDIAN_STATES, lookupPincode } from "@/lib/india";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

export function CheckoutView({
  products,
  customer,
  freeShippingThreshold = 999,
  shippingFee = 79,
  codEnabled = true,
}: {
  products: Product[];
  customer: Customer | null;
  freeShippingThreshold?: number;
  shippingFee?: number;
  codEnabled?: boolean;
}) {
  const router = useRouter();
  const { cart, clearCart, mounted, offer, clearOffer } = useStore();

  const [first, last] = customer ? splitName(customer.fullName) : ["", ""];
  const [form, setForm] = React.useState({
    firstName: first,
    lastName: last,
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    pincode: customer?.pincode ?? "",
    gstin: "",
  });

  const [pinStatus, setPinStatus] = React.useState<
    "idle" | "checking" | "found" | "notfound"
  >("idle");
  const [coupon, setCoupon] = React.useState<{ code: string; off: number } | null>(null);
  const [code, setCode] = React.useState("");
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponPending, startCoupon] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [placing, startPlacing] = React.useTransition();

  const map = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const lines = cart
    .map((l) => ({ product: map.get(l.id), qty: l.qty }))
    .filter((l): l is { product: Product; qty: number } => Boolean(l.product));

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  // Re-validate any coupon saved in the cart against current lines.
  React.useEffect(() => {
    if (!mounted || lines.length === 0) return;
    let code = "";
    try {
      code = localStorage.getItem(COUPON_STORAGE_KEY) ?? "";
    } catch {}
    if (!code) return;
    const refs = lines.map((l) => ({ id: l.product.id, qty: l.qty }));
    applyCoupon(code, refs).then((res) => {
      if (res.ok && res.discount) setCoupon({ code: res.code ?? code, off: res.discount });
      else {
        setCoupon(null);
        try {
          localStorage.removeItem(COUPON_STORAGE_KEY);
        } catch {}
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-muted">Loading checkout…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-20 text-center">
        <ShoppingBag size={36} className="text-faint" />
        <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted">
          Add a few gadgets before checking out.
        </p>
        <Link href="/shop" className={`${buttonVariants()} mt-6`}>
          Browse products
        </Link>
      </div>
    );
  }

  const discount = coupon?.off ?? 0;
  // Instant promo-popup discount stacks on top of any coupon (capped so the
  // order can't go below ₹0). The server re-validates the amount on submit.
  const instantOff = offer
    ? Math.min(offer.amount, Math.max(0, subtotal - discount))
    : 0;
  const afterDiscount = Math.max(0, subtotal - discount - instantOff);
  const shipping = afterDiscount >= freeShippingThreshold ? 0 : shippingFee;
  const total = afterDiscount + shipping;
  const savings = discount + instantOff;

  // GST is included in the displayed (tax-inclusive) prices; show how much.
  const gstIncl = Math.round(
    lines.reduce((s, l) => {
      const rate = l.product.gstRate || 18;
      const inc = l.product.price * l.qty;
      return s + (inc - inc / (1 + rate / 100));
    }, 0),
  );

  function submitCoupon() {
    const c = code.trim();
    if (!c) return;
    setCouponError(null);
    startCoupon(async () => {
      const refs = lines.map((l) => ({ id: l.product.id, qty: l.qty }));
      const res = await applyCoupon(c, refs);
      if (res.ok && res.discount) {
        setCoupon({ code: res.code ?? c, off: res.discount });
        setCode("");
        try { localStorage.setItem(COUPON_STORAGE_KEY, res.code ?? c); } catch {}
      } else {
        setCoupon(null);
        setCouponError(res.error ?? "Invalid coupon code");
        try { localStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
      }
    });
  }
  function clearCoupon() {
    setCoupon(null);
    setCouponError(null);
    try { localStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
  }

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  // Pincode → auto-detect state (and city if empty) via India Post.
  function onPincode(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: v }));
    if (v.length !== 6) {
      setPinStatus("idle");
      return;
    }
    setPinStatus("checking");
    lookupPincode(v).then((r) => {
      if (r?.state) {
        setForm((f) => ({ ...f, state: r.state!, city: f.city || r.city || "" }));
        setPinStatus("found");
      } else {
        setPinStatus("notfound");
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      gstin: form.gstin.trim().toUpperCase(),
      couponCode: coupon?.code,
      instantOffer: offer?.kind,
      items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
    };
    startPlacing(async () => {
      const res = await placeOrder(payload);
      if (res.ok) {
        clearCart();
        clearOffer();
        try {
          localStorage.removeItem(COUPON_STORAGE_KEY);
        } catch {}
        router.push(`/order/${res.orderNumber}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* shipping details */}
      <div className="space-y-6">
        {!customer ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-muted">Already have an account?</span>
            <Link href="/login" className="font-medium text-accent-bright hover:text-accent">
              Log in for faster checkout →
            </Link>
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Shipping details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">First name</span>
              <input required value={form.firstName} onChange={set("firstName")} className={inputCls} autoComplete="given-name" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Last name</span>
              <input required value={form.lastName} onChange={set("lastName")} className={inputCls} autoComplete="family-name" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <input required type="email" value={form.email} onChange={set("email")} className={inputCls} autoComplete="email" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Phone</span>
              <input required type="tel" value={form.phone} onChange={set("phone")} className={inputCls} autoComplete="tel" placeholder="10-digit mobile" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Address</span>
              <input required value={form.address} onChange={set("address")} className={inputCls} autoComplete="street-address" placeholder="House no., street, area" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">City</span>
              <input required value={form.city} onChange={set("city")} className={inputCls} autoComplete="address-level2" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Pincode</span>
              <input
                required
                value={form.pincode}
                onChange={onPincode}
                className={inputCls}
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                placeholder="6-digit"
              />
              {pinStatus === "checking" ? (
                <span className="mt-1 block text-xs text-faint">Detecting state…</span>
              ) : pinStatus === "found" ? (
                <span className="mt-1 block text-xs text-success">State filled automatically</span>
              ) : pinStatus === "notfound" ? (
                <span className="mt-1 block text-xs text-faint">
                  Couldn&apos;t detect — please pick your state.
                </span>
              ) : null}
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">State</span>
              <select
                required
                value={form.state}
                onChange={set("state")}
                className={`${inputCls} cursor-pointer`}
                autoComplete="address-level1"
              >
                <option value="" disabled>
                  Select state
                </option>
                {form.state && !INDIAN_STATES.includes(form.state as (typeof INDIAN_STATES)[number]) ? (
                  <option value={form.state}>{form.state}</option>
                ) : null}
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                GST number <span className="font-normal text-faint">(optional — for a business invoice)</span>
              </span>
              <input
                value={form.gstin}
                onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                className={inputCls}
                autoCapitalize="characters"
                maxLength={15}
                placeholder="15-digit GSTIN, e.g. 07ABCDE1234F1Z5"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Payment</h2>
          {codEnabled ? (
            <>
              <label className="flex items-start gap-3 rounded-lg border border-accent bg-accent-soft/50 p-3">
                <input type="radio" name="payment" defaultChecked className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
                <span>
                  <span className="block text-sm font-medium">Cash on Delivery</span>
                  <span className="block text-xs text-muted">Pay in cash when your order arrives.</span>
                </span>
              </label>
              <p className="mt-3 text-xs text-faint">
                Online payment via PhonePe is coming soon.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-3 text-sm text-danger">
              Online payments are coming soon and Cash on Delivery is currently
              paused. Please check back shortly.
            </p>
          )}
        </div>
      </div>

      {/* summary */}
      <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Your order</h2>
          <div className="mt-4 space-y-3">
            {lines.map(({ product, qty }) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                  <ProductArt art={product.art} glyphClassName="!h-[42%]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{shortTitle(product.name)}</p>
                  <p className="text-xs text-muted">Qty {qty}</p>
                </div>
                <span className="text-sm font-semibold">{formatINR(product.price * qty)}</span>
              </div>
            ))}
          </div>

          {/* coupon code */}
          {coupon ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-success">
                <Tag size={14} /> {coupon.code} applied
              </span>
              <button
                type="button"
                onClick={clearCoupon}
                className="text-faint hover:text-danger cursor-pointer"
                aria-label="Remove coupon"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Tag
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitCoupon();
                    }
                  }}
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm uppercase placeholder:normal-case placeholder:text-faint focus:border-accent focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={submitCoupon}
                disabled={couponPending}
                className="h-10 rounded-lg border border-border-bright px-4 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer"
              >
                {couponPending ? "…" : "Apply"}
              </button>
            </div>
          )}
          {couponError ? (
            <p className="mt-2 text-xs text-danger" role="alert">{couponError}</p>
          ) : null}

          {instantOff > 0 ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-accent-bright">
                <Tag size={14} /> Instant offer −{formatINR(instantOff)}
              </span>
              <button
                type="button"
                onClick={clearOffer}
                className="text-faint hover:text-danger cursor-pointer"
                aria-label="Remove instant offer"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          <dl className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatINR(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Coupon{coupon ? ` (${coupon.code})` : ""}</dt>
                <dd>−{formatINR(discount)}</dd>
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
              <dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="readout">{formatINR(total)}</dd>
            </div>
            <div className="flex justify-between text-xs text-faint">
              <dt>Includes GST</dt>
              <dd>{formatINR(gstIncl)}</dd>
            </div>
            {savings > 0 ? (
              <div className="flex justify-between text-xs font-medium text-success">
                <dt>You saved</dt>
                <dd>{formatINR(savings)}</dd>
              </div>
            ) : null}
          </dl>

          {error ? (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={placing || !codEnabled}
          >
            {placing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
            {!codEnabled
              ? "Ordering paused"
              : placing
                ? "Placing order…"
                : `Place order · ${formatINR(total)}`}
          </Button>
          <p className="mt-3 text-center text-xs text-faint">
            By placing this order you agree to our{" "}
            <Link href="/policies/terms" className="underline hover:text-foreground">Terms</Link>.
          </p>
        </div>
      </div>
    </form>
  );
}
