import Link from "next/link";
import { X } from "lucide-react";
import type { Category } from "@/lib/types";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";
import { formatINR } from "@/lib/format";

type Chip = { label: string; remove: RawParams };

/** Human label for the active price range, however it was set. */
function priceLabel(min?: number, max?: number): string | null {
  if (min && max) return `${formatINR(min)} – ${formatINR(max)}`;
  if (max) return `Under ${formatINR(max)}`;
  if (min) return `Above ${formatINR(min)}`;
  return null;
}

/**
 * The currently-applied filters shown as removable chips above the product
 * grid, so it's always clear what's narrowing the results — and each can be
 * cleared in one click. Renders nothing when no filters are active.
 */
export function ActiveFilters({
  params,
  categories,
}: {
  params: RawParams;
  categories: Category[];
}) {
  const chips: Chip[] = [];

  if (params.q) {
    chips.push({ label: `“${params.q}”`, remove: { q: undefined } });
  }

  if (params.category) {
    const name =
      categories.find((c) => c.slug === params.category)?.name ?? params.category;
    chips.push({ label: name, remove: { category: undefined } });
  }

  const price = priceLabel(
    params.minPrice ? Number(params.minPrice) : undefined,
    params.maxPrice ? Number(params.maxPrice) : undefined,
  );
  if (price) {
    chips.push({ label: price, remove: { minPrice: undefined, maxPrice: undefined } });
  }

  if (params.minDiscount) {
    chips.push({
      label: `${params.minDiscount}% off or more`,
      remove: { minDiscount: undefined },
    });
  }

  if (params.availability === "in" || params.availability === "out") {
    chips.push({
      label: params.availability === "in" ? "In stock" : "Out of stock",
      remove: { availability: undefined },
    });
  }

  // Rating has no sidebar control anymore, but if a stale `minRating` is in the
  // URL we still surface it as a removable chip.
  if (params.minRating) {
    chips.push({
      label: `${params.minRating}★ & above`,
      remove: { minRating: undefined },
    });
  }

  if (chips.length === 0) return null;

  const clearHref = buildShopUrl(params, {
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    minDiscount: undefined,
    availability: undefined,
    q: undefined,
    page: undefined,
  });

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-faint">Filters:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={buildShopUrl(params, { ...chip.remove, page: undefined })}
          scroll={false}
          className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent-bright"
        >
          {chip.label}
          <X size={12} className="text-faint transition-colors group-hover:text-accent-bright" />
        </Link>
      ))}
      {chips.length > 1 ? (
        <Link
          href={clearHref}
          scroll={false}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-danger"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
