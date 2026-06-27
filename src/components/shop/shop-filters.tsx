import Link from "next/link";
import { Check, Star, X } from "lucide-react";
import type { Category, CategorySlug } from "@/lib/types";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";
import { PriceSlider } from "./price-slider";
import { cn } from "@/lib/utils";

const RATINGS = [
  { label: "4★ & above", value: "4" },
  { label: "3★ & above", value: "3" },
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
  priceValue,
}: {
  params: RawParams;
  categories: Category[];
  counts: Record<CategorySlug, number>;
  priceFloor: number;
  priceCeil: number;
  priceValue: number;
}) {
  const hasFilters = Boolean(
    params.category ||
      params.minPrice ||
      params.maxPrice ||
      params.minRating ||
      params.availability,
  );
  const clearHref = buildShopUrl(params, {
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    availability: undefined,
    page: undefined,
  });

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
          <PriceSlider
            floor={priceFloor}
            ceil={priceCeil}
            value={priceValue}
            params={params}
          />
        </Group>

        <Group title="Rating">
          {RATINGS.map((r) => {
            const active = params.minRating === r.value;
            return (
              <Row
                key={r.value}
                href={buildShopUrl(params, {
                  minRating: active ? undefined : r.value,
                  page: undefined,
                })}
                active={active}
              >
                <span className="flex items-center gap-1.5">
                  <Star size={13} className="fill-highlight text-highlight" />
                  {r.label}
                </span>
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
