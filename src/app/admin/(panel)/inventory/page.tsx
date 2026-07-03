import Link from "next/link";
import { Boxes } from "lucide-react";
import { getAllProducts } from "@/lib/data/queries";
import {
  InventoryControls,
  InventoryPageSize,
} from "@/components/admin/inventory-controls";
import { InventoryTable } from "@/components/admin/inventory-table";
import { PageLink } from "@/components/admin/page-link";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [25, 50, 75, 100];

type SearchParams = Promise<{
  q?: string;
  status?: string;
  size?: string;
  page?: string;
}>;

type StockStatus = "all" | "in" | "low" | "out";

/** Build an inventory URL, omitting defaults so links stay clean. */
function hrefFor(p: { q?: string; status?: StockStatus; size?: number; page?: number }) {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.status && p.status !== "all") sp.set("status", p.status);
  if (p.size && p.size !== 25) sp.set("size", String(p.size));
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const qs = sp.toString();
  return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const status: StockStatus =
    sp.status === "in" || sp.status === "low" || sp.status === "out"
      ? sp.status
      : "all";
  const size = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 25;

  const products = await getAllProducts();

  // Catalog-wide counts for the status cards (independent of search/page).
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
  ).length;
  const inStock = products.filter((p) => p.stock > p.lowStockThreshold).length;
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  // Inventory value at landed cost (cost × units on hand).
  const inventoryValue = products.reduce((s, p) => s + p.cost * p.stock, 0);

  // Apply search + status filter.
  const ql = q.toLowerCase();
  let filtered = products.filter((p) => {
    if (ql && !(`${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(ql)))
      return false;
    if (status === "out") return p.stock === 0;
    if (status === "low") return p.stock > 0 && p.stock <= p.lowStockThreshold;
    if (status === "in") return p.stock > p.lowStockThreshold;
    return true;
  });

  // Items needing attention first.
  filtered = filtered.sort((a, b) => {
    const aLow = a.stock <= a.lowStockThreshold ? 0 : 1;
    const bLow = b.stock <= b.lowStockThreshold ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    return a.stock - b.stock;
  });

  // Paginate.
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const start = (page - 1) * size;
  const pageItems = filtered.slice(start, start + size);

  const cards: { key: StockStatus; label: string; value: number }[] = [
    { key: "in", label: "Healthy", value: inStock },
    { key: "low", label: "Low", value: lowStock },
    { key: "out", label: "Out", value: outOfStock },
    { key: "all", label: "Total", value: products.length },
  ];

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <div className="flex items-center gap-2">
        <Boxes size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        {totalUnits.toLocaleString("en-IN")} units across {products.length} SKUs.
        Tap a card to filter; changes apply to the storefront instantly.
      </p>

      {/* clickable status cards + inventory value */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const active = status === c.key;
          const color =
            c.value === 0
              ? ""
              : c.key === "out"
                ? "text-red-600"
                : c.key === "low"
                  ? "text-amber-600"
                  : c.key === "in"
                    ? "text-emerald-600"
                    : "";
          return (
            <Link
              key={c.key}
              href={hrefFor({ q, status: c.key, size })}
              aria-pressed={active}
              className={cn(
                "rounded-xl border bg-surface p-4 transition-colors hover:border-border-bright",
                active ? "border-accent ring-1 ring-accent" : "border-border",
              )}
            >
              <div className={cn("text-xl font-bold tracking-tight", color)}>{c.value}</div>
              <div className="tech-label mt-1">{c.label}</div>
            </Link>
          );
        })}
        <div className="col-span-2 rounded-xl border border-border bg-surface p-4 sm:col-span-1">
          <div className="readout text-xl font-bold tracking-tight text-accent">
            {formatINR(inventoryValue)}
          </div>
          <div className="tech-label mt-1">Inventory value</div>
        </div>
      </div>

      {/* search + clear */}
      <div className="mt-5">
        <InventoryControls q={q} status={status} size={size} />
      </div>

      <div className="mt-3 text-sm text-muted">
        {total === 0 ? (
          "No products match."
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {start + 1}–{Math.min(start + size, total)}
            </span>{" "}
            of {total}
            {status !== "all" || q ? " filtered" : ""} product{total === 1 ? "" : "s"}
          </>
        )}
      </div>

      <InventoryTable
        items={pageItems.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          image: p.image ?? null,
          art: p.art,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
        }))}
      />

      {/* page size + pagination */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InventoryPageSize q={q} status={status} size={size} sizes={PAGE_SIZES} />

        {pageCount > 1 ? (
          <div className="flex items-center gap-4">
            <PageLink
              disabled={page <= 1}
              href={hrefFor({ q, status, size, page: page - 1 })}
              dir="prev"
            />
            <span className="text-sm text-muted">
              Page <span className="font-semibold text-foreground">{page}</span> of {pageCount}
            </span>
            <PageLink
              disabled={page >= pageCount}
              href={hrefFor({ q, status, size, page: page + 1 })}
              dir="next"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
