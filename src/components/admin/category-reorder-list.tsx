"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { GripVertical, Pencil, EyeOff, Star, Loader2, Check } from "lucide-react";
import { ProductArt } from "@/components/product/product-art";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { reorderCategories } from "@/lib/admin/actions";
import { formatINR } from "@/lib/format";
import type { DeviceArt } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CategoryRowData {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  art: DeviceArt;
  image: string | null;
  hidden: boolean;
  featured: boolean;
  productCount: number;
  revenue: number;
}

/** Drag-to-reorder category list; persists sortOrder on drop. */
export function CategoryReorderList({ items: initial }: { items: CategoryRowData[] }) {
  const [items, setItems] = React.useState(initial);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setItems(initial);
  }, [initial]);

  function move(from: number, to: number) {
    setItems((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  }

  function persist(next: CategoryRowData[]) {
    setDragIndex(null);
    if (next.every((c, i) => c.id === initial[i]?.id)) return; // no change
    setSaved(false);
    start(async () => {
      await reorderCategories(next.map((c) => c.id));
      setSaved(true);
    });
  }

  return (
    <>
      <div className="mb-2 flex h-4 items-center justify-end text-xs">
        {pending ? (
          <span className="flex items-center gap-1 text-muted">
            <Loader2 size={12} className="animate-spin" /> Saving order…
          </span>
        ) : saved ? (
          <span className="flex items-center gap-1 text-success">
            <Check size={12} /> Order saved
          </span>
        ) : (
          <span className="text-faint">Drag ☰ to reorder</span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="divide-y divide-border">
          {items.map((c, i) => (
            <div
              key={c.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnter={() => {
                if (dragIndex !== null && dragIndex !== i) {
                  move(dragIndex, i);
                  setDragIndex(i);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => persist(items)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4",
                dragIndex === i ? "bg-surface-2 opacity-70" : "hover:bg-surface-2/50",
                c.hidden ? "opacity-70" : "",
              )}
            >
              <span className="cursor-grab text-faint active:cursor-grabbing" aria-label="Drag to reorder">
                <GripVertical size={16} />
              </span>

              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                {c.image ? (
                  <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <ProductArt art={c.art} glyphClassName="!h-[42%]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  {c.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                      <Star size={10} className="fill-amber-500 text-amber-500" /> Featured
                    </span>
                  ) : null}
                  {c.hidden ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      <EyeOff size={10} /> Hidden
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted">
                  <span className="font-mono text-faint">{c.slug}</span>
                  {c.tagline ? ` · ${c.tagline}` : ""}
                </div>
              </div>

              <div className="hidden w-28 text-right sm:block">
                <div className="readout text-sm font-semibold">{formatINR(c.revenue)}</div>
                <div className="text-xs text-faint">
                  {c.productCount} product{c.productCount === 1 ? "" : "s"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/categories/${c.id}/edit`}
                  className="inline-grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil size={15} />
                </Link>
                <DeleteCategoryButton id={c.id} name={c.name} productCount={c.productCount} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
