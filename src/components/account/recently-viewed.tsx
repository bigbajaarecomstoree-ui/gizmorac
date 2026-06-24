"use client";

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { formatINR } from "@/lib/format";

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

/** Show recently-viewed products from localStorage. */
export function RecentlyViewed({
  excludeSlug,
  limit = 6,
  heading = true,
}: {
  excludeSlug?: string;
  limit?: number;
  heading?: boolean;
}) {
  const [items, setItems] = React.useState<RecentItem[]>([]);
  React.useEffect(() => {
    setItems(read().filter((x) => x.slug !== excludeSlug).slice(0, limit));
  }, [excludeSlug, limit]);

  if (items.length === 0) return null;
  return (
    <section>
      {heading ? (
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Eye size={18} className="text-accent" /> Recently viewed
        </h2>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="group rounded-xl border border-border bg-surface p-2 transition-colors hover:border-accent"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-background">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{p.name}</p>
            <p className="mt-0.5 text-xs text-muted">{formatINR(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
