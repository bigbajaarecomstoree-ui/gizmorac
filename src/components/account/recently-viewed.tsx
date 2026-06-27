"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import type { Product } from "@/lib/types";
import { getRecentlyViewedProducts } from "@/lib/storefront/actions";
import { ProductGrid } from "@/components/product/product-grid";

const KEY = "gz_recently_viewed";

export interface RecentItem {
  slug: string;
  name: string;
  image: string | null;
  price: number;
}

function read(): RecentItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Record a product view in localStorage (rendered on the product page). */
export function TrackRecentlyViewed({ item }: { item: RecentItem }) {
  React.useEffect(() => {
    const list = read().filter((x) => x.slug !== item.slug);
    list.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 12)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);
  return null;
}

/**
 * Show recently-viewed products as full product cards (matching the rest of the
 * site). Slugs come from localStorage; full product data is hydrated server-side.
 */
export function RecentlyViewed({
  excludeSlug,
  limit = 6,
  heading = true,
}: {
  excludeSlug?: string;
  limit?: number;
  heading?: boolean;
}) {
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    const slugs = read()
      .map((x) => x.slug)
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
      {heading ? (
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Eye size={20} className="text-accent" /> Recently viewed
        </h2>
      ) : null}
      <ProductGrid products={products} className="mt-6 lg:grid-cols-4" />
    </section>
  );
}
