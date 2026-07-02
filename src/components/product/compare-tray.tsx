"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Scale, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { getRecentlyViewedProducts } from "@/lib/storefront/actions";
import { ProductArt } from "./product-art";
import { shortTitle } from "@/lib/format";

/**
 * Floating compare tray — shows the products queued for comparison with a CTA to
 * the side-by-side page. Mounted globally so the selection follows the shopper.
 */
export function CompareTray() {
  const { compare, compareCount, toggleCompare, clearCompare, pruneCompare, mounted } =
    useStore();
  const pathname = usePathname();
  const [products, setProducts] = React.useState<Product[]>([]);
  // Hide shopper chrome when the owner is previewing a product from the admin
  // panel ("View on store" opens the page with ?preview=1).
  const [preview, setPreview] = React.useState(false);

  React.useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).has("preview"));
  }, []);

  React.useEffect(() => {
    if (compare.length === 0) {
      setProducts([]);
      return;
    }
    let active = true;
    getRecentlyViewedProducts(compare).then((list) => {
      if (!active) return;
      setProducts(list);
      // Queued slugs that no longer resolve (deactivated/deleted products)
      // are pruned so the count matches what /compare will actually render.
      if (list.length < compare.length) {
        pruneCompare(list.map((p) => p.slug));
      }
    });
    return () => {
      active = false;
    };
  }, [compare, pruneCompare]);

  if (!mounted || preview || compareCount === 0) return null;

  // The cart/checkout mobile sticky bar owns the bottom edge there — showing
  // the tray too would stack two full-width bars (it stays on desktop, where
  // that bar is hidden).
  const onCheckoutFlow = pathname === "/cart" || pathname.startsWith("/checkout");
  // On PDPs the sticky buy bar (z-60, bottom-0, all breakpoints) slides in on
  // scroll and would cover the tray — lift the tray clear of it there.
  const onProduct = pathname.startsWith("/product/");

  return (
    <div
      className={`fixed inset-x-0 z-40 justify-center px-4 print:hidden ${
        onProduct ? "bottom-24" : "bottom-4"
      } ${onCheckoutFlow ? "hidden lg:flex" : "flex"}`}
    >
      <div className="flex max-w-full items-center gap-3 rounded-2xl border border-border-bright bg-elevated/95 p-2.5 pl-3.5 shadow-xl backdrop-blur">
        <span className="hidden items-center gap-1.5 text-sm font-semibold sm:flex">
          <Scale size={16} className="text-accent" /> Compare
        </span>
        <div className="flex items-center gap-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-surface"
            >
              {p.image ? (
                <Image src={p.image} alt={shortTitle(p.name)} fill sizes="44px" className="object-cover" />
              ) : (
                <ProductArt art={p.art} glyphClassName="!h-[44%]" />
              )}
              <button
                type="button"
                onClick={() => toggleCompare(p.slug, shortTitle(p.name))}
                aria-label={`Remove ${shortTitle(p.name)} from compare`}
                className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-background shadow cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - compareCount) }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-dashed border-border text-[0.625rem] text-faint"
            >
              Add
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={clearCompare}
          className="hidden px-1 text-xs text-faint hover:text-danger sm:block cursor-pointer"
        >
          Clear
        </button>
        <Link
          href="/compare"
          aria-disabled={compareCount < 2}
          className={`rounded-[var(--radius)] px-4 py-2.5 text-sm font-semibold transition-colors ${
            compareCount >= 2
              ? "bg-accent text-on-accent hover:bg-accent-hover"
              : "pointer-events-none bg-surface-2 text-faint"
          }`}
        >
          Compare ({compareCount})
        </Link>
      </div>
    </div>
  );
}
