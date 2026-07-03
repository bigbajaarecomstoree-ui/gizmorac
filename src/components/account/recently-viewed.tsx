"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import type { Product } from "@/lib/types";
import { getRecentlyViewedProducts } from "@/lib/storefront/actions";
import { ProductGrid } from "@/components/product/product-grid";

const KEY = "gz_recently_viewed";

/** Stored as a plain array of slugs; older entries were full objects. */
function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(v)) return [];
    return v
      .map((e) => (typeof e === "string" ? e : e?.slug))
      .filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

/** Record a product view in localStorage (rendered on the product page). */
export function TrackRecentlyViewed({ slug }: { slug: string }) {
  React.useEffect(() => {
    const list = read().filter((s) => s !== slug);
    list.unshift(slug);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12)));
  }, [slug]);
  return null;
}

/**
 * Show recently-viewed products as full product cards (matching the rest of the
 * site). Slugs come from localStorage; full product data is hydrated server-side.
 */
export function RecentlyViewed({
  excludeSlug,
  limit = 6,
}: {
  excludeSlug?: string;
  limit?: number;
}) {
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    const slugs = read()
      .filter((s) => s !== excludeSlug)
      .slice(0, limit);
    if (slugs.length === 0) {
      setProducts([]);
      return;
    }
    let active = true;
    getRecentlyViewedProducts(slugs).then((list) => {
      if (active) setProducts(list);
    });
    return () => {
      active = false;
    };
  }, [excludeSlug, limit]);

  if (products.length === 0) return null;
  return (
    <section>
      <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Eye size={20} className="text-accent" /> Recently viewed
      </h2>
      <ProductGrid products={products} className="mt-6 lg:grid-cols-4" />
    </section>
  );
}
