import Link from "next/link";
import Image from "next/image";
import { Plus, Tags, Pencil } from "lucide-react";
import { getCategories, getCategoryCounts } from "@/lib/data/queries";
import { ProductArt } from "@/components/product/product-art";
import { buttonVariants } from "@/components/ui/button";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Tags size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {categories.length} categories. These power the storefront menus,
            home grid and the product category picker.
          </p>
        </div>
        <Link href="/admin/categories/new" className={buttonVariants({ size: "sm" })}>
          <Plus size={16} />
          New category
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Tags size={32} className="text-faint" />
          <h2 className="mt-3 text-lg font-semibold">No categories yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add your first category so products can be organised and shoppers can
            browse by type.
          </p>
          <Link href="/admin/categories/new" className={`${buttonVariants()} mt-5`}>
            <Plus size={16} /> Create category
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="divide-y divide-border">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                  {c.image ? (
                    <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <ProductArt art={c.art} glyphClassName="!h-[42%]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted">
                    <span className="font-mono text-faint">{c.slug}</span>
                    {c.tagline ? ` · ${c.tagline}` : ""}
                  </div>
                </div>

                <div className="hidden w-24 text-right text-sm text-muted sm:block">
                  {counts[c.slug] ?? 0} product{(counts[c.slug] ?? 0) === 1 ? "" : "s"}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/categories/${c.id}/edit`}
                    className="inline-grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil size={15} />
                  </Link>
                  <DeleteCategoryButton id={c.id} name={c.name} productCount={counts[c.slug] ?? 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
