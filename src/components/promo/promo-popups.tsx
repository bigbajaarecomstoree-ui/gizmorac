"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, ShoppingCart, X } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { formatINR } from "@/lib/format";

const BROWSE_DELAY = 25_000; // ~25s of browsing
const CART_DELAY = 60_000; // ~1 min with items sitting in the cart
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
  browse: { enabled: boolean; amount: number };
  cart: { enabled: boolean; amount: number };
}) {
  const pathname = usePathname();
  const { cartCount, offer, claimOffer, mounted } = useStore();
  const [active, setActive] = React.useState<Kind | null>(null);

  const isUnder = (list: string[]) =>
    list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const browseSuppressed = isUnder(BROWSE_SUPPRESS);
  const cartSuppressed = isUnder(CART_SUPPRESS);

  // Latest values for the timeout callbacks (avoids re-arming timers).
  const ref = React.useRef({ browseSuppressed, cartSuppressed, offer, cartCount, active });
  ref.current = { browseSuppressed, cartSuppressed, offer, cartCount, active };

  // Browsing nudge — once per session, after a short delay.
  React.useEffect(() => {
    if (!mounted || !browse.enabled || browse.amount <= 0 || seen("browse")) return;
    const t = setTimeout(() => {
      const c = ref.current;
      if (c.browseSuppressed || c.offer || c.active) return;
      markSeen("browse");
      setActive("browse");
    }, BROWSE_DELAY);
    return () => clearTimeout(t);
  }, [mounted, browse.enabled, browse.amount]);

  // Cart-waiting — arms whenever items are present; fires after the dwell time.
  React.useEffect(() => {
    if (!mounted || !cart.enabled || cart.amount <= 0) return;
    if (cartCount <= 0 || seen("cart")) return;
    const t = setTimeout(() => {
      const c = ref.current;
      if (c.cartCount <= 0 || c.cartSuppressed || c.offer || c.active) return;
      markSeen("cart");
      setActive("cart");
    }, CART_DELAY);
    return () => clearTimeout(t);
  }, [mounted, cart.enabled, cart.amount, cartCount]);

  const activeSuppressed = active === "browse" ? browseSuppressed : cartSuppressed;
  if (!active || activeSuppressed) return null;

  const amount = active === "browse" ? browse.amount : cart.amount;
  const isCart = active === "cart";

  function claim() {
    claimOffer(active as Kind, amount);
    setActive(null);
  }

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Special offer"
      onClick={() => setActive(null)}
    >
      <div
        className="animate-rise relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="bg-accent px-6 py-7 text-center text-on-accent">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-on-accent/15">
            {isCart ? <ShoppingCart size={24} /> : <Gift size={24} />}
          </span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">
            {isCart ? "Your cart is waiting 🛒" : `Here's ${formatINR(amount)} off 🎁`}
          </h2>
        </div>

        <div className="px-6 py-6 text-center">
          <p className="text-sm leading-relaxed text-muted">
            {isCart
              ? `Complete your order now and get an extra ${formatINR(amount)} off — applied automatically, on top of any coupon. No code needed.`
              : `A little nudge to treat yourself. Claim now and we'll take ${formatINR(amount)} off at checkout — no code needed.`}
          </p>

          <button
            type="button"
            onClick={claim}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
          >
            Claim {formatINR(amount)} off
          </button>

          {isCart ? (
            <Link
              href="/cart"
              onClick={() => setActive(null)}
              className="mt-3 inline-block text-sm font-medium text-accent-bright hover:text-accent"
            >
              Go to cart →
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setActive(null)}
              className="mt-3 block w-full text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
