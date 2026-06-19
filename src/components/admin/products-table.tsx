"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Power, FileText, Trash2, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { ProductArt } from "@/components/product/product-art";
import { Badge } from "@/components/ui/badge";
import { DeleteProductDialog } from "@/components/admin/delete-product-dialog";
import { setProductsStatus, deleteProducts } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

const checkboxCls =
  "h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]";
const actionBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer";
const dangerBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/40 px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 cursor-pointer";

export function ProductsTable({
  products,
  categoryNames,
}: {
  products: Product[];
  categoryNames: Record<string, string>;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();
  const barCheckbox = React.useRef<HTMLInputElement>(null);

  const ids = React.useMemo(() => products.map((p) => p.id), [products]);
  const idSet = React.useMemo(() => new Set(ids), [ids]);
  // Only act on / count selections that still exist in the current list.
  const selectedIds = React.useMemo(
    () => [...selected].filter((id) => idSet.has(id)),
    [selected, idSet],
  );
  const selectedCount = selectedIds.length;
  const allSelected = ids.length > 0 && selectedCount === ids.length;
  const someSelected = selectedCount > 0;

  React.useEffect(() => {
    if (barCheckbox.current) {
      barCheckbox.current.indeterminate = someSelected && !allSelected;
    }
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const selectAll = () => setSelected(new Set(ids));
  const clear = () => setSelected(new Set());

  function bulkStatus(active: boolean) {
    const list = selectedIds;
    if (list.length === 0) return;
    startTransition(async () => {
      await setProductsStatus(list, active);
      clear();
    });
  }
  function bulkDelete() {
    const list = selectedIds;
    if (list.length === 0) return;
    if (
      !confirm(
        `Delete ${list.length} product${list.length === 1 ? "" : "s"} permanently? This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteProducts(list);
      clear();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {someSelected ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-accent-soft/60 px-4 py-2.5">
          <input
            ref={barCheckbox}
            type="checkbox"
            checked={allSelected}
            onChange={clear}
            aria-label="Clear selection"
            className={checkboxCls}
          />
          <span className="text-sm font-medium">{selectedCount} selected</span>
          {!allSelected ? (
            <button
              type="button"
              onClick={selectAll}
              className="text-sm font-medium text-accent-bright hover:text-accent cursor-pointer"
            >
              Select all {ids.length}
            </button>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {pending ? <Loader2 size={15} className="animate-spin text-muted" /> : null}
            <button type="button" onClick={() => bulkStatus(true)} disabled={pending} className={actionBtn}>
              <Power size={14} /> Set as active
            </button>
            <button type="button" onClick={() => bulkStatus(false)} disabled={pending} className={actionBtn}>
              <FileText size={14} /> Set as draft
            </button>
            <button type="button" onClick={bulkDelete} disabled={pending} className={dangerBtn}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden items-center gap-4 border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-faint sm:flex">
          <input
            type="checkbox"
            checked={false}
            onChange={selectAll}
            aria-label="Select all products"
            className={checkboxCls}
          />
          <span className="w-11 shrink-0" aria-hidden />
          <span className="flex-1">Product</span>
          <span className="w-20">Status</span>
          <span className="hidden w-32 lg:block">Category</span>
          <span className="w-24 text-right">Price</span>
          <span className="hidden w-16 text-right sm:block">Stock</span>
          <span className="w-20 text-right">Actions</span>
        </div>
      )}

      <div className="divide-y divide-border">
        {products.map((p) => {
          const checked = selected.has(p.id);
          const low = p.stock <= 10;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3 transition-colors",
                checked && "bg-accent-soft/30",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.id)}
                aria-label={`Select ${p.name}`}
                className={checkboxCls}
              />

              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border">
                {p.image ? (
                  <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <ProductArt art={p.art} glyphClassName="!h-[42%]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/product/${p.slug}`}
                    target="_blank"
                    className="truncate text-sm font-semibold transition-colors hover:text-accent-bright hover:underline"
                    title={`View ${p.name} on the store`}
                  >
                    {p.name}
                  </Link>
                  {p.isBestSeller ? <Badge variant="soft" size="sm">Best Seller</Badge> : null}
                  {p.isDeal ? <Badge variant="accent" size="sm">Deal</Badge> : null}
                </div>
                <div className="mt-0.5 font-mono text-xs text-faint">{p.sku}</div>
              </div>

              <div className="w-20">
                {p.active ? (
                  <Badge variant="success" size="sm">Active</Badge>
                ) : (
                  <Badge variant="surface" size="sm">Draft</Badge>
                )}
              </div>

              <div className="hidden w-32 text-sm text-muted lg:block">
                {categoryNames[p.category] ?? p.category}
              </div>

              <div className="w-24 text-right">
                <div className="readout text-sm font-semibold">{formatINR(p.price)}</div>
              </div>

              <div className="hidden w-16 text-right text-sm sm:block">
                <span className={low ? "font-medium text-accent-bright" : "text-muted"}>
                  {p.stock}
                </span>
              </div>

              <div className="flex w-20 shrink-0 items-center justify-end gap-2">
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil size={15} />
                </Link>
                <DeleteProductDialog id={p.id} name={p.name} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
