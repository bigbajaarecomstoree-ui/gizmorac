import Image from "next/image";
import { Boxes, TriangleAlert } from "lucide-react";
import { getAllProducts } from "@/lib/data/queries";
import { updateInventory } from "@/lib/admin/actions";
import { ProductArt } from "@/components/product/product-art";

export const dynamic = "force-dynamic";

const numCls =
  "h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none";

export default async function InventoryPage() {
  const products = await getAllProducts();

  // Surface the items that need attention first.
  const sorted = [...products].sort((a, b) => {
    const aLow = a.stock <= a.lowStockThreshold ? 0 : 1;
    const bLow = b.stock <= b.lowStockThreshold ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    return a.stock - b.stock;
  });

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
  ).length;
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);

  const summary = [
    { label: "SKUs", value: products.length },
    { label: "Units in stock", value: totalUnits },
    { label: "Low stock", value: lowStock },
    { label: "Out of stock", value: outOfStock },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <Boxes size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Update stock levels and low-stock alerts. Changes apply to the storefront instantly.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-xl font-bold tracking-tight">{s.value}</div>
            <div className="tech-label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="hidden border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-faint sm:grid sm:grid-cols-[1fr_auto_auto_auto]">
          <span>Product</span>
          <span className="w-24 text-center">Stock</span>
          <span className="w-28 text-center">Low at</span>
          <span className="w-20 text-right">Action</span>
        </div>
        <div className="divide-y divide-border">
          {sorted.map((p) => {
            const out = p.stock === 0;
            const low = !out && p.stock <= p.lowStockThreshold;
            return (
              <form
                key={p.id}
                action={updateInventory}
                className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto]"
              >
                <input type="hidden" name="id" value={p.id} />
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
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                          <TriangleAlert size={12} /> Out of stock
                        </span>
                      ) : low ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-bright">
                          <TriangleAlert size={12} /> Low
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 sm:w-24 sm:justify-center">
                  <span className="text-xs text-muted sm:hidden">Stock</span>
                  <input
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={p.stock}
                    className={numCls}
                    aria-label={`Stock for ${p.name}`}
                  />
                </label>

                <label className="flex items-center gap-2 sm:w-28 sm:justify-center">
                  <span className="text-xs text-muted sm:hidden">Low at</span>
                  <input
                    name="lowStockThreshold"
                    type="number"
                    min={0}
                    defaultValue={p.lowStockThreshold}
                    className={numCls}
                    aria-label={`Low-stock threshold for ${p.name}`}
                  />
                </label>

                <div className="sm:w-20 sm:text-right">
                  <button
                    type="submit"
                    className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
