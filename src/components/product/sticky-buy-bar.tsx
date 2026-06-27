"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap } from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { ProductArt } from "./product-art";
import { Button } from "@/components/ui/button";
import { formatINR, shortTitle } from "@/lib/format";

/**
 * Mobile-only sticky bottom buy bar. Appears once the main purchase block
 * (`#pdp-purchase`) scrolls out of view, keeping Buy Now / Add to Cart reachable.
 */
export function StickyBuyBar({
  id,
  name,
  price,
  stock,
  art,
}: {
  id: string;
  name: string;
  price: number;
  stock: number;
  art: DeviceArt;
}) {
  const router = useRouter();
  const { addToCart, loggedIn } = useStore();
  const [show, setShow] = React.useState(false);
  const outOfStock = stock <= 0;

  React.useEffect(() => {
    // Show the bar once the main purchase block has scrolled above the viewport
    // (user scrolled past Buy Now) — not while it's still on screen or below.
    const onScroll = () => {
      const el = document.getElementById("pdp-purchase");
      if (!el) return;
      setShow(el.getBoundingClientRect().bottom < 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (outOfStock) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-transform duration-300 lg:hidden print:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
          <ProductArt art={art} glyphClassName="!h-[44%]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">{shortTitle(name)}</p>
          <p className="readout text-base font-bold leading-tight">{formatINR(price)}</p>
        </div>
        <Button
          variant="highlight"
          size="md"
          className="px-3"
          onClick={() => addToCart(id, 1, shortTitle(name))}
        >
          <ShoppingCart size={16} />
        </Button>
        <Button
          variant="primary"
          size="md"
          className="px-4"
          onClick={() => {
            addToCart(id, 1, shortTitle(name));
            router.push(loggedIn ? "/checkout" : "/login?next=/checkout");
          }}
        >
          <Zap size={16} />
          Buy Now
        </Button>
      </div>
    </div>
  );
}
