"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShoppingBag, Tag, X, Truck, Star, Plus } from "lucide-react";
import type { Address, Customer, Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { ProductArt } from "@/components/product/product-art";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatINR, shortTitle } from "@/lib/format";
import { applyCoupon, placeOrder, startPhonePePayment, getDeliveryEstimate, lookupCodPincode } from "@/lib/storefront/actions";
import { computeCodAdvance, type CodAdvanceConfig } from "@/lib/data/cod";
import { track } from "@/lib/analytics";
import { COUPON_STORAGE_KEY } from "@/lib/checkout-shared";
import { INDIAN_STATES, lookupPincode } from "@/lib/india";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  return [parts[0] ?? "", parts.slice(1).join(" ")];
}

const COD_ADVANCE_OFF: CodAdvanceConfig = {
  codAdvanceEnabled: false,
  codAdvanceType: "FIXED",
  codAdvanceAmount: 0,
  codAdvancePercent: 0,
  codAdvanceMax: 0,
  codAdvanceMin: 0,
};

export function CheckoutView({
  products,
  customer,
  addresses = [],
  freeShippingThreshold = 999,
  shippingFee = 79,
  codEnabled = true,
  phonepeEnabled = false,
  codAdvanceReady = false,
  codAdvance = COD_ADVANCE_OFF,
}: {
  products: Product[];
  customer: Customer | null;
  addresses?: Address[];
  freeShippingThreshold?: number;
  shippingFee?: number;
  codEnabled?: boolean;
  phonepeEnabled?: boolean;
  /** Server-computed: gateway configured AND production-safe — the exact
   * condition under which placeOrder will actually take a COD advance. */
  codAdvanceReady?: boolean;
  codAdvance?: CodAdvanceConfig;
}) {
  const router = useRouter();
  const { cart, clearCart, mounted, offer, clearOffer } = useStore();

  // Seed the form from the default saved address, else the profile fields.
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [seedFirst, seedLast] = defaultAddr
    ? splitName(defaultAddr.fullName)
    : customer
      ? splitName(customer.fullName)
      : ["", ""];
  const [form, setForm] = React.useState({
    firstName: seedFirst,
    lastName: seedLast,
    email: customer?.email ?? "",
    phone: defaultAddr?.phone ?? customer?.phone ?? "",
    address: defaultAddr?.line1 ?? customer?.address ?? "",
    city: defaultAddr?.city ?? customer?.city ?? "",
    state: defaultAddr?.state ?? customer?.state ?? "",
    pincode: defaultAddr?.pincode ?? customer?.pincode ?? "",
    gstin: "",
    companyName: "",
  });
  const [selectedAddr, setSelectedAddr] = React.useState<string>(
    defaultAddr?.id ?? "new",
  );

  const [pinStatus, setPinStatus] = React.useState<
    "idle" | "checking" | "found" | "notfound"
  >("idle");
  const [eta, setEta] = React.useState<{
    serviceable: boolean;
    days: number;
    codAvailable: boolean;
  } | null>(null);
  // Live per-pincode delivery fee (Shiprocket). "ok"/"error" → fee is known
  // (error falls back to the flat fee); "unserviceable" → we can't deliver.
  const [shipStatus, setShipStatus] = React.useState<
    "idle" | "checking" | "ok" | "unserviceable" | "error"
  >("idle");
  const [shipFee, setShipFee] = React.useState(shippingFee);
  // Online payment is the default whenever it's available; COD is only the
  // fallback when PhonePe isn't configured.
  const [payMethod, setPayMethod] = React.useState<"PhonePe" | "COD">(
    phonepeEnabled ? "PhonePe" : "COD",
  );
  // COD-advance consent (T&C / COD Policy / Refund Policy).
  const [accepted, setAccepted] = React.useState(false);
  // Per-pincode COD rule for the entered pincode (null = global behaviour).
  const [pinCod, setPinCod] = React.useState<{ codAllowed: boolean; mode: string; advanceOverride: number | null } | null>(null);
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

  // begin_checkout — fire once when the cart first resolves.
  const beganRef = React.useRef(false);
  React.useEffect(() => {
    if (beganRef.current || lines.length === 0) return;
    beganRef.current = true;
    track("begin_checkout", {
      currency: "INR",
      value: subtotal,
      items: lines.map((l) => ({
        item_id: l.product.id,
        item_name: l.product.name,
        price: l.product.price,
        quantity: l.qty,
      })),
    });
  }, [lines, subtotal]);

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

  // Per-pincode COD rule lookup whenever a valid pincode is set. (Declared
  // before the early returns so the hook order is stable.)
  React.useEffect(() => {
    if (!/^\d{6}$/.test(form.pincode)) { setPinCod(null); return; }
    let active = true;
    lookupCodPincode(form.pincode).then((r) => { if (active) setPinCod(r); });
    return () => { active = false; };
  }, [form.pincode]);

  // If the entered pincode blocks COD while COD is selected, fall back to online.
  React.useEffect(() => {
    if (payMethod === "COD" && pinCod && !pinCod.codAllowed && phonepeEnabled) {
      setPayMethod("PhonePe");
    }
  }, [pinCod, payMethod, phonepeEnabled]);

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
  // Shipping: free over the threshold; otherwise the live per-pincode courier
  // fee once a serviceable pincode is known.
  const freeShip = afterDiscount >= freeShippingThreshold;
  const pinValid = /^\d{6}$/.test(form.pincode);
  const feeKnown = shipStatus === "ok" || shipStatus === "error";
  const notDeliverable = pinValid && shipStatus === "unserviceable";
  // null = not resolved yet (needs a pincode) so we don't show a misleading total.
  const shipping: number | null = freeShip ? 0 : feeKnown ? shipFee : null;
  const total = afterDiscount + (shipping ?? 0);
  const savings = discount + instantOff;
  // Free-shipping nudge: how much more to add to cross the threshold.
  const awayFromFree = freeShip ? 0 : Math.max(0, freeShippingThreshold - afterDiscount);

  // COD booking advance (server re-computes authoritatively on submit). A
  // HIGHER_CHARGE pincode raises the advance; PREPAID_ONLY/COD_DISABLED hide COD.
  const codBlockedHere = pinCod ? !pinCod.codAllowed : false;
  const codAvailable = codEnabled && !codBlockedHere;
  const effCodConfig =
    pinCod?.mode === "HIGHER_CHARGE" && pinCod.advanceOverride != null
      ? { ...codAdvance, codAdvanceEnabled: true, codAdvanceType: "FIXED", codAdvanceAmount: pinCod.advanceOverride }
      : codAdvance;
  const cod = computeCodAdvance(effCodConfig, total);
  // Gate on the server's real readiness (configured + production-safe), not
  // just "configured" — otherwise a sandbox gateway on prod shows the advance
  // panel + consent while placeOrder quietly places a standard COD order.
  const codAdvanceActive = payMethod === "COD" && codAdvanceReady && cod.enabled;
  // Shipping unresolved (no pincode yet / still checking) → any figure that
  // folds it in would mislead; show placeholders instead of a lower total.
  const shippingPending = !freeShip && shipping === null;

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

  // Fetch the live courier ETA + freight for a pincode (Shiprocket). Drives both
  // the delivery estimate line and the order's shipping fee.
  function checkDelivery(pin: string) {
    if (!/^\d{6}$/.test(pin)) {
      setEta(null);
      setShipStatus("idle");
      return;
    }
    setEta(null);
    setShipStatus("checking");
    getDeliveryEstimate(pin).then((res) => {
      if (!res.ok) {
        // Shiprocket not connected / unreachable → flat fallback, still checkout-able.
        setEta(null);
        setShipFee(shippingFee);
        setShipStatus("error");
        return;
      }
      setEta({ serviceable: res.serviceable, days: res.days, codAvailable: res.codAvailable });
      if (!res.serviceable) {
        setShipStatus("unserviceable");
        return;
      }
      setShipFee(res.ratePaise > 0 ? Math.round(res.ratePaise / 100) : shippingFee);
      setShipStatus("ok");
    });
  }

  // Pincode → auto-detect state (and city if empty) via India Post.
  function onPincode(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: v }));
    if (v.length !== 6) {
      setPinStatus("idle");
      setEta(null);
      setShipStatus("idle");
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
    // Delivery ETA + freight via Shiprocket.
    checkDelivery(v);
  }

  // Pick a saved address → fill the shipping fields and refresh the ETA.
  function applyAddress(a: Address) {
    const [fn, ln] = splitName(a.fullName);
    setForm((f) => ({
      ...f,
      firstName: fn,
      lastName: ln,
      phone: a.phone,
      address: a.line1,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
    }));
    setSelectedAddr(a.id);
    if (/^\d{6}$/.test(a.pincode)) {
      setPinStatus("found");
      checkDelivery(a.pincode);
    } else {
      setPinStatus("idle");
      setEta(null);
      setShipStatus("idle");
    }
  }

  // Clear the address fields to type a brand-new delivery address.
  function useNewAddress() {
    setSelectedAddr("new");
    setForm((f) => ({ ...f, address: "", city: "", state: "", pincode: "" }));
    setPinStatus("idle");
    setEta(null);
    setShipStatus("idle");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (notDeliverable) {
      setError("Sorry, we don't deliver to this pincode yet.");
      return;
    }
    if (!freeShip && !feeKnown) {
      setError("Enter your delivery pincode to calculate shipping.");
      return;
    }
    if (codAdvanceActive && !accepted) {
      setError("Please accept the Terms & Conditions and COD Policy to continue.");
      return;
    }
    const payload = {
      ...form,
      gstin: form.gstin.trim().toUpperCase(),
      companyName: form.companyName.trim(),
      couponCode: coupon?.code,
      instantOffer: offer?.kind,
      paymentMethod: payMethod,
      acceptedTerms: accepted,
      items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
    };
    // Leave checkout for the order's tokenised tracking page: clear the local
    // cart/offer/coupon (the order now owns them) and navigate.
    const goToOrder = (trackUrl: string) => {
      clearCart();
      clearOffer();
      try {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      } catch {}
      router.push(trackUrl);
    };
    startPlacing(async () => {
      const res = await placeOrder(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Tokenised link so guests can track without an account.
      const trackUrl = `/order/${res.orderNumber}-${res.trackingToken}`;
      // Full prepaid OR a COD order that needs its booking advance → PhonePe.
      if (res.paymentMethod === "PhonePe" || res.requiresAdvance) {
        const pay = await startPhonePePayment(res.orderNumber, res.trackingToken);
        if (pay.ok) {
          clearCart();
          clearOffer();
          try {
            localStorage.removeItem(COUPON_STORAGE_KEY);
          } catch {}
          window.location.href = pay.redirectUrl; // hand off to PhonePe
        } else {
          // The order ALREADY exists here (stock held, coupon consumed).
          // Staying on checkout with a re-enabled submit button would mint a
          // duplicate order + double stock decrement on the next click — so
          // hand over to the order page, whose pending-payment banner owns
          // the "Complete payment" retry for exactly this state.
          goToOrder(trackUrl);
        }
      } else {
        goToOrder(trackUrl);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
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

          {customer && addresses.length > 0 ? (
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium">Deliver to</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {addresses.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => applyAddress(a)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selectedAddr === a.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-border-bright"
                    }`}
                  >
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      {a.fullName}
                      {a.label ? (
                        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                          {a.label}
                        </span>
                      ) : null}
                      {a.isDefault ? <Star size={11} className="text-accent" /> : null}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted">
                      {a.line1}, {a.city}, {a.state} — {a.pincode}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={useNewAddress}
                  className={`rounded-xl border border-dashed p-3 text-left transition-colors ${
                    selectedAddr === "new"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Plus size={14} /> Use a new address
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">Enter details below</span>
                </button>
              </div>
            </div>
          ) : null}

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
              {eta ? (
                eta.serviceable ? (
                  <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-accent-bright">
                    <Truck size={12} className="shrink-0" /> Delivers in ~{eta.days} day
                    {eta.days === 1 ? "" : "s"}
                    {eta.codAvailable ? " · COD available" : " · COD not available"}
                  </span>
                ) : (
                  <span className="mt-1.5 block text-xs text-danger">
                    Sorry, we don&apos;t deliver to this pincode yet.
                  </span>
                )
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
            {form.gstin.trim() ? (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">
                  Company name <span className="text-danger">*</span>
                </span>
                <input
                  required
                  value={form.companyName}
                  onChange={set("companyName")}
                  className={inputCls}
                  autoComplete="organization"
                  placeholder="Registered business name (for the GST invoice)"
                />
              </label>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Payment</h2>
          {phonepeEnabled || codEnabled ? (
            <div className="space-y-2.5">
              {phonepeEnabled ? (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    payMethod === "PhonePe"
                      ? "border-accent bg-accent-soft/50"
                      : "border-border hover:border-border-bright"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payMethod === "PhonePe"}
                    onChange={() => setPayMethod("PhonePe")}
                    className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Pay online — UPI, Cards &amp; more
                    </span>
                    <span className="block text-xs text-muted">
                      Secure payment via PhonePe. Pay now and your order is confirmed instantly.
                    </span>
                  </span>
                </label>
              ) : null}
              {codAvailable ? (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    payMethod === "COD"
                      ? "border-accent bg-accent-soft/50"
                      : "border-border hover:border-border-bright"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payMethod === "COD"}
                    onChange={() => setPayMethod("COD")}
                    className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">Cash on Delivery</span>
                    <span className="block text-xs text-muted">Pay in cash when your order arrives.</span>
                  </span>
                </label>
              ) : null}

              {codEnabled && codBlockedHere ? (
                <p className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-xs text-muted">
                  Cash on Delivery isn&apos;t available for this pincode — please pay online.
                </p>
              ) : null}

              {codAdvanceActive ? (
                <div className="rounded-lg border border-accent/40 bg-accent-soft/40 p-3.5">
                  <p className="text-sm font-medium">
                    Pay {formatINR(cod.advance)} now to confirm your order.
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    The remaining amount is collected upon delivery.
                  </p>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {/* Totals that fold shipping in stay dashes until the
                        pincode resolves (the booking amount itself is known). */}
                    <div className="flex justify-between">
                      <dt className="text-muted">Order total</dt>
                      <dd>{shippingPending ? "—" : formatINR(total)}</dd>
                    </div>
                    <div className="flex justify-between font-medium">
                      <dt className="text-accent">Pay now</dt>
                      <dd className="text-accent">{formatINR(cod.advance)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Pay on delivery</dt>
                      <dd className="font-medium">{shippingPending ? "—" : formatINR(cod.remaining)}</dd>
                    </div>
                  </dl>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-accent/20 pt-3">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-xs text-muted">
                      I agree to the{" "}
                      <Link href="/policies/terms" target="_blank" className="underline hover:text-foreground">Terms &amp; Conditions</Link>,{" "}
                      <Link href="/policies/cod-policy" target="_blank" className="underline hover:text-foreground">COD Policy</Link>{" "}
                      and{" "}
                      <Link href="/policies/refund" target="_blank" className="underline hover:text-foreground">Refund Policy</Link>.
                    </span>
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-3 text-sm text-danger">
              Payments are paused right now. Please check back shortly.
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
                  {product.image ? (
                    <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <ProductArt art={product.art} glyphClassName="!h-[42%]" />
                  )}
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
              <dd>
                {freeShip ? (
                  <span className="font-medium text-success">Free</span>
                ) : !pinValid ? (
                  <span className="text-faint">Enter pincode</span>
                ) : shipStatus === "checking" ? (
                  <span className="text-faint">Calculating…</span>
                ) : notDeliverable ? (
                  <span className="text-danger">Not serviceable</span>
                ) : (
                  formatINR(shipping ?? 0)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="readout">
                {shippingPending ? (
                  <span className="text-sm font-medium text-faint">
                    {pinValid ? "—" : "Enter pincode"}
                  </span>
                ) : (
                  formatINR(total)
                )}
              </dd>
            </div>
            {codAdvanceActive ? (
              <>
                <div className="flex justify-between text-sm font-medium text-accent">
                  <dt>Pay now (booking)</dt>
                  <dd>{formatINR(cod.advance)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted">Pay on delivery</dt>
                  <dd className="font-medium">{formatINR(cod.remaining)}</dd>
                </div>
              </>
            ) : null}
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

          {awayFromFree > 0 ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-highlight/50 bg-highlight/10 px-3 py-2.5 text-xs leading-snug">
              <Truck size={15} className="mt-0.5 shrink-0 text-accent-bright" />
              <span>
                You&apos;re{" "}
                <span className="font-bold text-accent-bright">{formatINR(awayFromFree)}</span>{" "}
                away from <span className="font-semibold">FREE home delivery</span> — add a
                little more to your cart and save on shipping.
              </span>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={
              placing ||
              (!phonepeEnabled && !codEnabled) ||
              (codAdvanceActive && !accepted) ||
              notDeliverable
            }
          >
            {placing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
            {!phonepeEnabled && !codEnabled
              ? "Payments paused"
              : placing
                ? payMethod === "PhonePe" || codAdvanceActive
                  ? "Redirecting to PhonePe…"
                  : "Placing order…"
                : shippingPending
                  ? "Enter pincode to see total"
                  : codAdvanceActive
                    ? `Pay ${formatINR(cod.advance)} now`
                    : payMethod === "PhonePe"
                      ? `Pay ${formatINR(total)}`
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
