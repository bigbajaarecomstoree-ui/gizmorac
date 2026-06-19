"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Loader2, PackageSearch, TriangleAlert, X } from "lucide-react";
import type { DeviceArt } from "@/lib/types";
import { bulkUpdateInventory } from "@/lib/admin/actions";
import { ProductArt } from "@/components/product/product-art";
import { cn } from "@/lib/utils";

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  art: DeviceArt;
  stock: number;
  lowStockThreshold: number;
};

type Draft = { stock: number; low: number };

const numCls =
  "h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none";

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  const router = useRouter();

  // Server-truth values, rebuilt whenever the page re-renders after a save.
  const originals = useMemo(
    () => new Map(items.map((i) => [i.id, { stock: i.stock, low: i.lowStockThreshold } as Draft])),
    [items],
  );

  // Only rows that differ from server truth live here → these are the "unsaved" rows.
  const [draft, setDraft] = useState<Map<string, Draft>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = useState("");
  const [bulkLow, setBulkLow] = useState("");
  const [saving, startSaving] = useTransition();
  const [savedTick, setSavedTick] = useState(false);

  // After a save the server sends fresh `items`; drop any drafts that now match.
  useEffect(() => {
    setDraft((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [id, d] of prev) {
        const o = originals.get(id);
        if (!o || (o.stock === d.stock && o.low === d.low)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => originals.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [originals]);

  useEffect(() => {
    if (!savedTick) return;
    const t = setTimeout(() => setSavedTick(false), 2200);
    return () => clearTimeout(t);
  }, [savedTick]);

  const valueFor = (id: string): Draft =>
    draft.get(id) ?? originals.get(id) ?? { stock: 0, low: 0 };

  function setField(id: string, field: keyof Draft, raw: string) {
    const n = Math.max(0, Math.round(Number(raw)));
    const value = Number.isFinite(n) ? n : 0;
    setDraft((prev) => {
      const o = originals.get(id);
      if (!o) return prev;
      const cur = prev.get(id) ?? { ...o };
      const updated = { ...cur, [field]: value };
      const next = new Map(prev);
      if (updated.stock === o.stock && updated.low === o.low) next.delete(id);
      else next.set(id, updated);
      return next;
    });
  }

  const dirtyIds = useMemo(() => [...draft.keys()], [draft]);
  const dirtyCount = dirtyIds.length;

  // ---- selection ----
  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- bulk apply to selected (becomes unsaved edits → saved via Save All) ----
  function applyBulk() {
    const s = bulkStock.trim();
    const l = bulkLow.trim();
    if (s === "" && l === "") return;
    const stockVal = s === "" ? null : Math.max(0, Math.round(Number(s)) || 0);
    const lowVal = l === "" ? null : Math.max(0, Math.round(Number(l)) || 0);
    setDraft((prev) => {
      const next = new Map(prev);
      for (const id of selected) {
        const o = originals.get(id);
        if (!o) continue;
        const cur = next.get(id) ?? { ...o };
        const updated: Draft = {
          stock: stockVal ?? cur.stock,
          low: lowVal ?? cur.low,
        };
        if (updated.stock === o.stock && updated.low === o.low) next.delete(id);
        else next.set(id, updated);
      }
      return next;
    });
    setBulkStock("");
    setBulkLow("");
  }

  function discardAll() {
    setDraft(new Map());
  }

  function saveAll() {
    if (dirtyCount === 0) return;
    const edits = dirtyIds.map((id) => {
      const d = valueFor(id);
      return { id, stock: d.stock, lowStockThreshold: d.low };
    });
    startSaving(async () => {
      const res = await bulkUpdateInventory(edits);
      if (!res.error) {
        setSavedTick(true);
        router.refresh(); // pull fresh server data; the effect clears saved drafts
      }
    });
  }

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="hidden border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-faint sm:grid sm:grid-cols-[auto_1fr_auto_auto]">
          <span className="flex w-8 items-center">
            <input
              type="checkbox"
              aria-label="Select all products"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer accent-accent"
            />
          </span>
          <span>Product</span>
          <span className="w-24 text-center">Stock</span>
          <span className="w-28 text-center">Low at</span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <PackageSearch size={32} className="text-faint" />
            <p className="mt-3 text-sm text-muted">No products match these filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((p) => {
              const v = valueFor(p.id);
              const out = v.stock === 0;
              const low = !out && v.stock <= v.low;
              const isDirty = draft.has(p.id);
              const isSel = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "grid grid-cols-1 items-center gap-3 px-4 py-3 transition-colors sm:grid-cols-[auto_1fr_auto_auto]",
                    out && "bg-danger/10",
                    low && "bg-accent/10",
                    isSel && "ring-1 ring-inset ring-accent/40",
                  )}
                >
                  <div className="flex w-8 items-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={isSel}
                      onChange={() => toggleOne(p.id)}
                      className="h-4 w-4 cursor-pointer accent-accent"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border">
                      {p.image ? (
                        <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />
                      ) : (
                        <ProductArt art={p.art} glyphClassName="!h-[42%]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-faint">{p.sku}</span>
                        {out ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                            <TriangleAlert size={12} /> Out of stock
                          </span>
                        ) : low ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-bright">
                            <TriangleAlert size={12} /> Low
                          </span>
                        ) : null}
                        {isDirty ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-accent-bright">
                            Unsaved
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 sm:w-24 sm:justify-center">
                    <span className="text-xs text-muted sm:hidden">Stock</span>
                    <input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) => setField(p.id, "stock", e.target.value)}
                      className={cn(numCls, isDirty && "border-accent")}
                      aria-label={`Stock for ${p.name}`}
                    />
                  </label>

                  <label className="flex items-center gap-2 sm:w-28 sm:justify-center">
                    <span className="text-xs text-muted sm:hidden">Low at</span>
                    <input
                      type="number"
                      min={0}
                      value={v.low}
                      onChange={(e) => setField(p.id, "low", e.target.value)}
                      className={cn(numCls, isDirty && "border-accent")}
                      aria-label={`Low-stock threshold for ${p.name}`}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky action bar — appears when rows are selected, there are unsaved
          edits, or we're briefly confirming a save. */}
      {selected.size > 0 || dirtyCount > 0 || savedTick ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
          <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-border-bright bg-surface/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            {/* bulk-edit selected */}
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{selected.size} selected</span>
                <span className="hidden text-faint sm:inline">·</span>
                <span className="text-xs text-muted">Set</span>
                <input
                  type="number"
                  min={0}
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  placeholder="Stock"
                  className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={bulkLow}
                  onChange={(e) => setBulkLow(e.target.value)}
                  placeholder="Low at"
                  className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyBulk}
                  disabled={!bulkStock.trim() && !bulkLow.trim()}
                  className="h-8 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-muted transition-colors hover:text-foreground"
                >
                  <X size={14} /> Clear
                </button>
              </div>
            ) : (
              <span />
            )}

            {/* save all */}
            <div className="flex items-center justify-end gap-3">
              {dirtyCount > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={discardAll}
                    disabled={saving}
                    className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={saveAll}
                    disabled={saving}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                    Save All ({dirtyCount})
                  </button>
                </>
              ) : savedTick ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                  <Check size={16} /> Saved
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
