"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ShoppingCart, Check } from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { ProductArt } from "./product-art";
import { Button } from "@/components/ui/button";
import { formatINR, shortTitle } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  art: DeviceArt;
};

/**
 * "Complete your setup" cross-sell — the current product plus a few suggestions,
 * with a real combined total and a one-click multi-add. Honest framing (these are
 * suggestions, not real co-purchase data) and no fabricated bundle discount.
 */
export function BundleAdd({ items }: { items: Item[] }) {
  const { addToCart } = useStore();
  const [picked, setPicked] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((it) => [it.id, true])),
  );

  if (items.length < 2) return null;

  const chosen = items.filter((it) => picked[it.id]);
  const total = chosen.reduce((s, it) => s + it.price, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm font-semibold text-foreground">Complete your setup</p>
      <p className="mt-0.5 text-xs text-faint">Add these together and check out in one go.</p>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {items.map((it, i) => (
          <React.Fragment key={it.id}>
            {i > 0 ? <Plus size={16} className="mt-9 shrink-0 text-faint" /> : null}
            <div className="relative w-28">
              <button
                type="button"
                onClick={() => setPicked((p) => ({ ...p, [it.id]: !p[it.id] }))}
                aria-pressed={picked[it.id]}
                aria-label={picked[it.id] ? `Remove ${shortTitle(it.name)}` : `Add ${shortTitle(it.name)}`}
                className={cn(
                  "absolute left-1 top-1 z-10 grid h-5 w-5 place-items-center rounded border bg-background cursor-pointer",
                  picked[it.id] ? "border-accent bg-accent text-on-accent" : "border-border-bright",
                )}
              >
                {picked[it.id] ? <Check size={13} /> : null}
              </button>
              <Link href={`/product/${it.slug}`} className="group block text-center">
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface">
                  {it.image ? (
                    <Image src={it.image} alt="" fill sizes="112px" className="object-cover" />
                  ) : (
                    <ProductArt art={it.art} glyphClassName="!h-[44%]" />
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[0.7rem] leading-snug text-muted group-hover:text-accent">
                  {shortTitle(it.name)}
                </p>
                <p className="readout text-xs font-semibold text-foreground">{formatINR(it.price)}</p>
              </Link>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <span className="text-xs text-faint">
            Total for {chosen.length} item{chosen.length === 1 ? "" : "s"}
          </span>
          <p className="readout text-lg font-bold text-foreground">{formatINR(total)}</p>
        </div>
        <Button
          variant="primary"
          size="md"
          disabled={chosen.length === 0}
          onClick={() => chosen.forEach((it) => addToCart(it.id, 1, shortTitle(it.name)))}
        >
          <ShoppingCart size={16} /> Add {chosen.length} to cart
        </Button>
      </div>
    </div>
  );
}
