import Link from "next/link";
import { Check, X } from "lucide-react";
import type { Category, CategorySlug } from "@/lib/types";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

type Bracket = { label: string; min?: number; max?: number };

// Quick price brackets — faster than dragging a slider, and consistent with the
// rest of the (navigation-style) filter rows. Filtered to the live price range.
const PRICE_BRACKETS: Bracket[] = [
  { label: "Under ₹500", max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹3,000", min: 1000, max: 3000 },
  { label: "₹3,000 – ₹5,000", min: 3000, max: 5000 },
  { label: "Above ₹5,000", min: 5000 },
];

const DISCOUNTS = [
  { label: "20% off or more", value: "20" },
  { label: "40% off or more", value: "40" },
  { label: "60% off or more", value: "60" },
  { label: "80% off or more", value: "80" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-5 first:pt-0 last:border-0">
      <h3 className="tech-label mb-3.5">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-accent-soft text-accent-bright"
          : "text-muted hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <span>{children}</span>
      {active ? <Check size={14} /> : null}
    </Link>
  );
}

export function ShopFilters({
  params,
  categories,
  counts,
  priceFloor,
  priceCeil,
}: {
  params: RawParams;
  categories: Category[];
  counts: Record<CategorySlug, number>;
  priceFloor: number;
  priceCeil: number;
}) {
  const hasFilters = Boolean(
    params.category ||
      params.minPrice ||
      params.maxPrice ||
      params.minRating ||
      params.minDiscount ||
      params.availability,
  );
  const clearHref = buildShopUrl(params, {
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    minDiscount: undefined,
    availability: undefined,
    page: undefined,
  });

  const curMin = params.minPrice ? Number(params.minPrice) : undefined;
  const curMax = params.maxPrice ? Number(params.maxPrice) : undefined;
  // Only show brackets that can hold products within the catalog's price range.
  const brackets = PRICE_BRACKETS.filter(
    (b) => (b.min ?? 0) < priceCeil && (b.max ?? Infinity) > priceFloor,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* header + clear all */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasFilters ? (
          <Link
            href={clearHref}
            scroll={false}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <X size={13} /> Clear all
          </Link>
        ) : null}
      </div>

      <div className="border-t border-border">
        <Group title="Category">
          {/* The category list is navigation: clicking a category browses it and
              clears any active search (q), so a click always lands on products. */}
          <Row
            href={buildShopUrl(params, { category: undefined, q: undefined, page: undefined })}
            active={!params.category}
          >
            All products
          </Row>
          {categories.map((c) => (
            <Row
              key={c.slug}
              href={buildShopUrl(params, { category: c.slug, q: undefined, page: undefined })}
              active={params.category === c.slug}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span>{c.name}</span>
                <span className="font-mono text-[0.6875rem] text-faint">
                  {counts[c.slug] ?? 0}
                </span>
              </span>
            </Row>
          ))}
        </Group>

        <Group title="Price">
          {brackets.map((b) => {
            const active = (b.min ?? undefined) === curMin && (b.max ?? undefined) === curMax;
            return (
              <Row
                key={b.label}
                href={buildShopUrl(params, {
                  minPrice: active ? undefined : b.min ? String(b.min) : undefined,
                  maxPrice: active ? undefined : b.max ? String(b.max) : undefined,
                  page: undefined,
                })}
                active={active}
              >
                {b.label}
              </Row>
            );
          })}
        </Group>

        <Group title="Discount">
          {DISCOUNTS.map((d) => {
            const active = params.minDiscount === d.value;
            return (
              <Row
                key={d.value}
                href={buildShopUrl(params, {
                  minDiscount: active ? undefined : d.value,
                  page: undefined,
                })}
                active={active}
              >
                {d.label}
              </Row>
            );
          })}
        </Group>

        <Group title="Availability">
          <Row
            href={buildShopUrl(params, {
              availability: params.availability === "in" ? undefined : "in",
              page: undefined,
            })}
            active={params.availability === "in"}
          >
            In stock
          </Row>
          <Row
            href={buildShopUrl(params, {
              availability: params.availability === "out" ? undefined : "out",
              page: undefined,
            })}
            active={params.availability === "out"}
          >
            Out of stock
          </Row>
        </Group>
      </div>
    </div>
  );
}
