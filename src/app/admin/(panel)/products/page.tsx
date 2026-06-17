import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { getAllProducts } from "@/lib/data/queries";
import { categories } from "@/lib/data/categories";
import { formatINR } from "@/lib/format";
import { ProductArt } from "@/components/product/product-art";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const CATEGORY_NAME = Object.fromEntries(
  categories.map((c) => [c.slug, c.name]),
);

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted">{products.length} products in your catalog.</p>
        </div>
        <Link href="/admin/products/new" className={buttonVariants({ size: "sm" })}>
          <Plus size={16} />
          Add product
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="divide-y divide-border">
          {products.map((p) => {
            const low = p.stock <= 10;
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                  {p.image ? (
                    <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <ProductArt art={p.art} glyphClassName="!h-[42%]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    {p.isBestSeller ? <Badge variant="soft" size="sm">Best Seller</Badge> : null}
                    {p.isDeal ? <Badge variant="accent" size="sm">Deal</Badge> : null}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-faint">{p.sku}</div>
                </div>

                <div className="hidden w-36 text-sm text-muted sm:block">
                  {CATEGORY_NAME[p.category] ?? p.category}
                </div>

                <div className="w-24 text-right">
                  <div className="readout text-sm font-semibold">{formatINR(p.price)}</div>
                </div>

                <div className="hidden w-20 text-right text-sm sm:block">
                  <span className={low ? "font-medium text-accent-bright" : "text-muted"}>
                    {p.stock}
                  </span>
                  <div className="tech-label !text-[0.5rem]">in stock</div>
                </div>

                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil size={15} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
