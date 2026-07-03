"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, ShoppingCart, X, Check } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { formatINR } from "@/lib/format";

// Browse nudge stays off the cart/checkout flow; the cart-waiting reminder is
// allowed on the cart page (it's the whole point), just not during checkout.
const BROWSE_SUPPRESS = ["/checkout", "/cart", "/order", "/login", "/signup"];
const CART_SUPPRESS = ["/checkout", "/order", "/login", "/signup"];

type Kind = "browse" | "cart";

function seen(kind: Kind): boolean {
  try {
    return sessionStorage.getItem(`gizmorac.popup.${kind}`) === "1";
  } catch {
    return false;
  }
}
function markSeen(kind: Kind) {
  try {
    sessionStorage.setItem(`gizmorac.popup.${kind}`, "1");
  } catch {}
}

/**
 * Auto promo popups while browsing: a "browsing nudge" after a short delay and a
 * "cart is waiting" reminder after items sit a while. Claiming applies an instant
 * discount (validated server-side) that stacks on any coupon — no code needed.
 */
export function PromoPopups({
  browse,
  cart,
}: {
  browse: { enabled: boolean; amount: number; delaySec: number };
  cart: { enabled: boolean; amount: number; delaySec: number };
}) {
  const pathname = usePathname();
  const { cartCount, offer, claimOffer, mounted } = useStore();
  const [active, setActive] = React.useState<Kind | null>(null);
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  const isUnder = (list: string[]) =>
    list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const browseSuppressed = isUnder(BROWSE_SUPPRESS);
  const cartSuppressed = isUnder(CART_SUPPRESS);

  // Latest values for the timeout callbacks (avoids re-arming timers). Updated
  // after each render so the delayed callbacks read fresh values.
  const ref = React.useRef({ browseSuppressed, cartSuppressed, offer, cartCount, active });
  React.useEffect(() => {
    ref.current = { browseSuppressed, cartSuppressed, offer, cartCount, active };
  });

  // Browsing nudge — once per session, after a short delay.
  React.useEffect(() => {
    if (!mounted || !browse.enabled || browse.amount <= 0 || seen("browse")) return;
    const t = setTimeout(() => {
      const c = ref.current;
      if (c.browseSuppressed || c.offer || c.active) return;
      markSeen("browse");
      setActive("browse");
    }, Math.max(1, browse.delaySec) * 1000);
    return () => clearTimeout(t);
  }, [mounted, browse.enabled, browse.amount, browse.delaySec]);

  // Cart-waiting — arms whenever items are present; fires after the dwell time.
  React.useEffect(() => {
    if (!mounted || !cart.enabled || cart.amount <= 0) return;
    if (cartCount <= 0 || seen("cart")) return;
    const t = setTimeout(() => {
      const c = ref.current;
      if (c.cartCount <= 0 || c.cartSuppressed || c.offer || c.active) return;
      markSeen("cart");
      setActive("cart");
    }, Math.max(1, cart.delaySec) * 1000);
    return () => clearTimeout(t);
  }, [mounted, cart.enabled, cart.amount, cart.delaySec, cartCount]);

  const activeSuppressed = active === "browse" ? browseSuppressed : cartSuppressed;
  if (!active || activeSuppressed) return null;

  const amount = active === "browse" ? browse.amount : cart.amount;
  const isCart = active === "cart";

  // Native <dialog> handles Escape, Tab focus-trapping and focus restore
  // (mirrors LandingPopup). The element only renders while active, so show it
  // as soon as it mounts.
  function mountDialog(el: HTMLDialogElement | null) {
    dialogRef.current = el;
    if (el && !el.open) el.showModal();
  }

  function claim() {
    claimOffer(active as Kind, amount);
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={mountDialog}
      onClose={() => setActive(null)}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      aria-label="Special offer"
      className="animate-rise relative m-auto w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-[1.5rem] bg-surface text-foreground shadow-2xl ring-1 ring-black/5 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => dialogRef.current?.close()}
        aria-label="Close"
        className="absolute right-3.5 top-3.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-on-accent backdrop-blur transition-colors hover:bg-white/30 cursor-pointer"
      >
        <X size={16} />
      </button>

      {/* gradient header — the offer is the hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-accent to-[#a855f7] px-6 pb-10 pt-8 text-center text-on-accent">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-highlight/30 blur-2xl" />
        <div aria-hidden className="grid-ticks pointer-events-none absolute inset-0 opacity-20" />

        <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          {isCart ? <ShoppingCart size={26} /> : <Gift size={26} />}
        </span>
        <p className="tech-label relative mt-4 !text-on-accent/70">
          {isCart ? "Your cart is waiting" : "A gift, just for you"}
        </p>
        <div className="relative mt-1.5 flex items-end justify-center gap-1.5">
          <span className="text-[2.75rem] font-extrabold leading-none tracking-tight">
            {formatINR(amount)}
          </span>
          <span className="mb-1 text-lg font-extrabold text-highlight">OFF</span>
        </div>
      </div>

      {/* coupon perforation seam */}
      <div className="relative h-0">
        <span aria-hidden className="absolute left-3 -top-3 h-6 w-6 rounded-full bg-surface" />
        <span aria-hidden className="absolute right-3 -top-3 h-6 w-6 rounded-full bg-surface" />
        <div className="absolute inset-x-10 -top-px border-t-2 border-dashed border-border" />
      </div>

      {/* body */}
      <div className="px-6 pb-6 pt-6 text-center">
        <p className="text-sm leading-relaxed text-muted">
          {isCart
            ? `Finish your order and we'll knock an extra ${formatINR(amount)} off — automatically.`
            : `Treat yourself. Claim it now and we'll take ${formatINR(amount)} off your order.`}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-medium text-foreground">
          <span className="inline-flex items-center gap-1">
            <Check size={13} className="text-success" /> No code needed
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={13} className="text-success" /> Auto-applied
          </span>
          <span className="inline-flex items-center gap-1">
            <Check size={13} className="text-success" /> Stacks with coupons
          </span>
        </div>

        <button
          type="button"
          onClick={claim}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-on-accent shadow-[var(--shadow-glow)] transition-all hover:bg-accent-hover hover:shadow-lg active:scale-[0.99] cursor-pointer"
        >
          <Gift size={16} /> Claim {formatINR(amount)} off
        </button>

        {isCart ? (
          <Link
            href="/cart"
            onClick={() => dialogRef.current?.close()}
            className="mt-3 inline-block text-sm font-semibold text-accent-bright hover:text-accent"
          >
            Go to cart →
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="mt-3 block w-full text-sm font-medium text-faint transition-colors hover:text-foreground cursor-pointer"
          >
            Maybe later
          </button>
        )}
      </div>
    </dialog>
  );
}
