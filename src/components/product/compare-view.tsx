"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Scale, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { getRecentlyViewedProducts } from "@/lib/storefront/actions";
import { ProductArt } from "./product-art";
import { Price } from "./price";
import { RatingStars } from "./rating-stars";
import { AddToCartButton } from "./add-to-cart-button";
import { buttonVariants } from "@/components/ui/button";
import { shortTitle } from "@/lib/format";

function warrantyLabel(months: number): string {
  if (months >= 12) {
    const y = Math.round(months / 12);
    return `${y} Year${y > 1 ? "s" : ""}`;
  }
  if (months > 0) return `${months} Months`;
  return "—";
}

export function CompareView() {
  const { compare, toggleCompare, mounted } = useStore();
  const [products, setProducts] = React.useState<Product[] | null>(null);

  React.useEffect(() => {
    if (compare.length === 0) {
      setProducts([]);
      return;
    }
    let active = true;
    getRecentlyViewedProducts(compare).then((list) => {
      if (active) setProducts(list);
    });
    return () => {
      active = false;
    };
  }, [compare]);

  if (!mounted || products === null) {
    return <div className="py-20 text-center text-sm text-muted">Loading comparison…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-20 text-center">
        <Scale size={36} className="text-faint" />
        <h2 className="mt-4 text-xl font-semibold">Nothing to compare yet</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted">
          Add products to compare using the scale icon on any product, then come back here.
        </p>
        <Link href="/shop" className={`${buttonVariants()} mt-6`}>
          Browse products
        </Link>
      </div>
    );
  }

  // Non-null binding so nested render closures keep the narrowed type.
  const items: Product[] = products;

  // Union of spec labels across the compared products, preserving first-seen order.
  const specLabels: string[] = [];
  for (const p of items) {
    for (const s of p.specs) if (!specLabels.includes(s.label)) specLabels.push(s.label);
  }
  const specOf = (p: Product, label: string) =>
    p.specs.find((s) => s.label === label)?.value ?? "—";

  const cols = `minmax(96px,120px) repeat(${items.length}, minmax(180px,1fr))`;

  function Row({
    label,
    render,
    head = false,
  }: {
    label: string;
    render: (p: Product) => React.ReactNode;
    head?: boolean;
  }) {
    return (
      <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
        <div className="bg-surface-2 px-3 py-3 text-xs font-medium text-muted">{label}</div>
        {items.map((p) => (
          <div
            key={p.id}
            className={`border-l border-border px-3 py-3 text-sm ${head ? "" : "text-foreground"}`}
          >
            {render(p)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <div className="min-w-max">
        {/* product header row */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
          <div className="bg-surface-2 px-3 py-4 text-xs font-semibold uppercase tracking-wide text-faint">
            Product
          </div>
          {items.map((p) => (
            <div key={p.id} className="relative border-l border-border p-3">
              <button
                type="button"
                onClick={() => toggleCompare(p.slug, shortTitle(p.name))}
                aria-label={`Remove ${shortTitle(p.name)}`}
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface text-muted hover:text-danger cursor-pointer"
              >
                <X size={13} />
              </button>
              <Link href={`/product/${p.slug}`} className="block">
                <div className="relative mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-lg border border-border bg-surface">
                  {p.image ? (
                    <Image src={p.image} alt={shortTitle(p.name)} fill sizes="140px" className="object-cover" />
                  ) : (
                    <ProductArt art={p.art} glyphClassName="!h-[44%]" />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug hover:text-accent-bright">
                  {shortTitle(p.name)}
                </p>
              </Link>
            </div>
          ))}
        </div>

        <Row label="Price" head render={(p) => <Price product={p} size="sm" />} />
        <Row label="Rating" head render={(p) => <RatingStars rating={p.rating} count={p.reviewCount} />} />
        <Row label="Brand" render={(p) => p.brand} />
        <Row label="Warranty" render={(p) => warrantyLabel(p.warrantyMonths)} />
        <Row
          label="Availability"
          render={(p) =>
            p.stock > 0 ? (
              <span className="text-success">In stock</span>
            ) : (
              <span className="text-danger">Out of stock</span>
            )
          }
        />
        {specLabels.map((label) => (
          <Row key={label} label={label} render={(p) => specOf(p, label)} />
        ))}

        {/* actions */}
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="bg-surface-2 px-3 py-3" />
          {items.map((p) => (
            <div key={p.id} className="border-l border-border p-3">
              <AddToCartButton
                id={p.id}
                name={shortTitle(p.name)}
                variant="primary"
                size="sm"
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
