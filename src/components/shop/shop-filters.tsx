import Link from "next/link";
import { Check, Star } from "lucide-react";
import type { Category, CategorySlug } from "@/lib/types";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

const PRICE_RANGES = [
  { label: "Under ₹1,000", min: undefined, max: "999" },
  { label: "₹1,000 – ₹2,000", min: "1000", max: "2000" },
  { label: "₹2,000 – ₹3,000", min: "2000", max: "3000" },
  { label: "Over ₹3,000", min: "3000", max: undefined },
];

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
}: {
  params: RawParams;
  categories: Category[];
  counts: Record<CategorySlug, number>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <Group title="Category">
        <Row href={buildShopUrl(params, { category: undefined, page: undefined })} active={!params.category}>
          All products
        </Row>
        {categories.map((c) => (
          <Row
            key={c.slug}
            href={buildShopUrl(params, { category: c.slug, page: undefined })}
            active={params.category === c.slug}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span>{c.name}</span>
              <span className="font-mono text-[0.6875rem] text-faint">
                {counts[c.slug]}
              </span>
            </span>
          </Row>
        ))}
      </Group>

      <Group title="Price">
        {PRICE_RANGES.map((r) => {
          const active = params.minPrice === r.min && params.maxPrice === r.max;
          return (
            <Row
              key={r.label}
              href={buildShopUrl(params, {
                minPrice: active ? undefined : r.min,
                maxPrice: active ? undefined : r.max,
                page: undefined,
              })}
              active={active}
            >
              {r.label}
            </Row>
          );
        })}
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
                <Star size={13} className="fill-accent text-accent" />
                {r.label}
              </span>
            </Row>
          );
        })}
      </Group>

      <Group title="Availability">
        <Row
          href={buildShopUrl(params, {
            inStock: params.inStock === "1" ? undefined : "1",
            page: undefined,
          })}
          active={params.inStock === "1"}
        >
          In stock only
        </Row>
      </Group>
    </div>
  );
}
