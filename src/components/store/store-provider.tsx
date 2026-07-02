"use client";

import * as React from "react";
import { Check, Heart, ShoppingCart } from "lucide-react";

interface CartLine {
  id: string;
  qty: number;
}

/** An instant promo-popup discount the shopper has claimed (browse/cart offer). */
export interface ClaimedOffer {
  kind: "browse" | "cart";
  amount: number;
}

interface Toast {
  id: number;
  message: string;
  icon: "cart" | "heart" | "info";
}

interface StoreState {
  cart: CartLine[];
  wishlist: string[];
  cartCount: number;
  wishlistCount: number;
  mounted: boolean;
  /** Whether a customer is signed in (seeded server-side from the session). */
  loggedIn: boolean;
  offer: ClaimedOffer | null;
  /** Product slugs queued for side-by-side comparison (max 4). */
  compare: string[];
  compareCount: number;
  addToCart: (id: string, qty?: number, name?: string) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: string, name?: string) => void;
  isInWishlist: (id: string) => boolean;
  toggleCompare: (slug: string, name?: string, category?: string) => void;
  isInCompare: (slug: string) => boolean;
  clearCompare: () => void;
  /** Silently drop queued slugs that no longer resolve to a live product. */
  pruneCompare: (validSlugs: string[]) => void;
  claimOffer: (kind: ClaimedOffer["kind"], amount: number) => void;
  clearOffer: () => void;
  toast: (message: string, icon?: Toast["icon"]) => void;
}

const CART_KEY = "gizmorac.cart";
const WISH_KEY = "gizmorac.wishlist";
const OFFER_KEY = "gizmorac.offer";
const COMPARE_KEY = "gizmorac.compare";
const COMPARE_CAT_KEY = "gizmorac.compareCat";
const COMPARE_MAX = 4;

const StoreContext = React.createContext<StoreState | null>(null);

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({
  children,
  loggedIn = false,
}: {
  children: React.ReactNode;
  loggedIn?: boolean;
}) {
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [wishlist, setWishlist] = React.useState<string[]>([]);
  const [compare, setCompare] = React.useState<string[]>([]);
  // Category all compared products must share (set by the first added item).
  const [compareCategory, setCompareCategory] = React.useState<string | null>(null);
  const [offer, setOffer] = React.useState<ClaimedOffer | null>(null);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const toastId = React.useRef(0);

  // One-time hydration from localStorage after mount. This must run in an effect
  // (not during render) to avoid an SSR hydration mismatch, so the synchronous
  // setState calls here are intentional.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const c = localStorage.getItem(CART_KEY);
      const w = localStorage.getItem(WISH_KEY);
      const o = localStorage.getItem(OFFER_KEY);
      const cmp = localStorage.getItem(COMPARE_KEY);
      const cmpCat = localStorage.getItem(COMPARE_CAT_KEY);
      if (c) setCart(JSON.parse(c));
      if (w) setWishlist(JSON.parse(w));
      if (o) setOffer(JSON.parse(o));
      if (cmp) setCompare(JSON.parse(cmp));
      if (cmpCat) setCompareCategory(cmpCat);
    } catch {
      // ignore malformed storage
    }
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  React.useEffect(() => {
    if (mounted) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, mounted]);
  React.useEffect(() => {
    if (mounted) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, mounted]);
  React.useEffect(() => {
    if (mounted) localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
  }, [compare, mounted]);
  React.useEffect(() => {
    if (!mounted) return;
    if (compareCategory) localStorage.setItem(COMPARE_CAT_KEY, compareCategory);
    else localStorage.removeItem(COMPARE_CAT_KEY);
  }, [compareCategory, mounted]);
  React.useEffect(() => {
    if (!mounted) return;
    if (offer) localStorage.setItem(OFFER_KEY, JSON.stringify(offer));
    else localStorage.removeItem(OFFER_KEY);
  }, [offer, mounted]);

  const toast = React.useCallback(
    (message: string, icon: Toast["icon"] = "info") => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { id, message, icon }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 2800);
    },
    [],
  );

  const addToCart = React.useCallback(
    (id: string, qty = 1, name?: string) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.id === id);
        if (existing) {
          return prev.map((l) =>
            l.id === id ? { ...l, qty: l.qty + qty } : l,
          );
        }
        return [...prev, { id, qty }];
      });
      toast(name ? `Added ${name} to cart` : "Added to cart", "cart");
    },
    [toast],
  );

  const setQty = React.useCallback((id: string, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
    );
  }, []);

  const removeFromCart = React.useCallback((id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearCart = React.useCallback(() => setCart([]), []);

  const toggleWishlist = React.useCallback(
    (id: string, name?: string) => {
      setWishlist((prev) => {
        if (prev.includes(id)) {
          toast(name ? `Removed ${name} from wishlist` : "Removed from wishlist", "heart");
          return prev.filter((x) => x !== id);
        }
        toast(name ? `Saved ${name} to wishlist` : "Saved to wishlist", "heart");
        return [...prev, id];
      });
    },
    [toast],
  );

  const isInWishlist = React.useCallback(
    (id: string) => wishlist.includes(id),
    [wishlist],
  );

  const toggleCompare = React.useCallback(
    (slug: string, name?: string, category?: string) => {
      // Remove if already queued (clearing the shared category when emptied).
      if (compare.includes(slug)) {
        const next = compare.filter((s) => s !== slug);
        setCompare(next);
        if (next.length === 0) setCompareCategory(null);
        toast(name ? `Removed ${name} from compare` : "Removed from compare", "info");
        return;
      }
      if (compare.length >= COMPARE_MAX) {
        toast(`You can compare up to ${COMPARE_MAX} products`, "info");
        return;
      }
      // Compare only works within one category.
      if (compare.length > 0 && compareCategory && category && category !== compareCategory) {
        toast("You can only compare products from the same category — pick another from this category.", "info");
        return;
      }
      setCompare([...compare, slug]);
      if (compare.length === 0 && category) setCompareCategory(category);
      toast(name ? `Added ${name} to compare` : "Added to compare", "info");
    },
    [compare, compareCategory, toast],
  );

  const isInCompare = React.useCallback(
    (slug: string) => compare.includes(slug),
    [compare],
  );

  const clearCompare = React.useCallback(() => {
    setCompare([]);
    setCompareCategory(null);
  }, []);

  // Deactivated/hard-deleted products can linger in the persisted queue; the
  // tray prunes them once it knows which slugs actually resolve, so the badge
  // count and the "Compare (n)" CTA never disagree with the compare page.
  const pruneCompare = React.useCallback((validSlugs: string[]) => {
    setCompare((prev) => {
      const next = prev.filter((s) => validSlugs.includes(s));
      return next.length === prev.length ? prev : next;
    });
  }, []);

  // Invariant: an emptied queue (any path — toggle, clear, prune) drops the
  // shared category lock.
  React.useEffect(() => {
    if (mounted && compare.length === 0) setCompareCategory(null);
  }, [compare, mounted]);

  const claimOffer = React.useCallback(
    (kind: ClaimedOffer["kind"], amount: number) => {
      setOffer({ kind, amount });
      toast(`₹${amount} off applied — it's added at checkout`, "cart");
    },
    [toast],
  );

  const clearOffer = React.useCallback(() => setOffer(null), []);

  const value: StoreState = {
    cart,
    wishlist,
    cartCount: cart.reduce((n, l) => n + l.qty, 0),
    wishlistCount: wishlist.length,
    mounted,
    loggedIn,
    offer,
    compare,
    compareCount: compare.length,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
    isInWishlist,
    toggleCompare,
    isInCompare,
    clearCompare,
    pruneCompare,
    claimOffer,
    clearOffer,
    toast,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-rise pointer-events-auto flex items-center gap-2.5 rounded-[var(--radius)] border border-border-bright bg-elevated/95 px-4 py-3 text-sm shadow-xl backdrop-blur"
            role="status"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-accent-bright">
              {t.icon === "cart" ? (
                <ShoppingCart size={14} />
              ) : t.icon === "heart" ? (
                <Heart size={14} />
              ) : (
                <Check size={14} />
              )}
            </span>
            <span className="text-foreground">{t.message}</span>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}
