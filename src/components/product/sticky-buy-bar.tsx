"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap } from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { ProductArt } from "./product-art";
import { Button } from "@/components/ui/button";
import { formatINR, shortTitle } from "@/lib/format";

/**
 * Sticky bottom buy bar (mobile + desktop). Appears once the main purchase block
 * (`#pdp-purchase`) scrolls out of view, keeping price + Buy Now / Add to Cart
 * reachable at all times. Desktop shows labels, MRP and discount; mobile stays
 * compact.
 */
export function StickyBuyBar({
  id,
  name,
  price,
  mrp,
  stock,
  art,
  image,
}: {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  stock: number;
  art: DeviceArt;
  image?: string | null;
}) {
  const router = useRouter();
  const { addToCart, loggedIn } = useStore();
  const [show, setShow] = React.useState(false);
  const outOfStock = stock <= 0;
  const off = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  React.useEffect(() => {
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
      className={`fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-transform duration-300 print:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="shell flex items-center gap-3 py-2.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
          {image ? (
            <Image src={image} alt="" fill sizes="44px" className="object-cover" />
          ) : (
            <ProductArt art={art} glyphClassName="!h-[44%]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">{shortTitle(name)}</p>
          <div className="flex items-baseline gap-2">
            <span className="readout text-base font-bold leading-tight">{formatINR(price)}</span>
            {off > 0 ? (
              <>
                <span className="hidden text-xs text-faint line-through sm:inline">
                  {formatINR(mrp!)}
                </span>
                <span className="hidden text-xs font-semibold text-success sm:inline">
                  {off}% off
                </span>
              </>
            ) : null}
          </div>
        </div>
        <Button
          variant="highlight"
          size="md"
          className="gap-2 px-3 sm:px-5"
          onClick={() => addToCart(id, 1, shortTitle(name))}
        >
          <ShoppingCart size={16} />
          <span className="hidden sm:inline">Add to Cart</span>
        </Button>
        <Button
          variant="primary"
          size="md"
          className="gap-2 px-4 sm:px-6"
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
