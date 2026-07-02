import Link from "next/link";
import { Plus, Tags, Layers, PackageX, Star } from "lucide-react";
import {
  getCategories,
  getCategoryCounts,
  getCategoryRevenue,
} from "@/lib/data/queries";
import { buttonVariants } from "@/components/ui/button";
import { CategoryReorderList } from "@/components/admin/category-reorder-list";
import { AdminSubnav } from "@/components/admin/admin-subnav";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, counts, revenue] = await Promise.all([
    getCategories(),
    getCategoryCounts(),
    getCategoryRevenue(),
  ]);

  const productsAssigned = categories.reduce((s, c) => s + (counts[c.slug] ?? 0), 0);
  const emptyCount = categories.filter((c) => (counts[c.slug] ?? 0) === 0).length;
  const featuredCount = categories.filter((c) => c.featured).length;

  const cards = [
    { label: "Categories", value: categories.length, icon: Tags, accent: true },
    { label: "Products assigned", value: productsAssigned, icon: Layers },
    { label: "Empty", value: emptyCount, icon: PackageX, warn: emptyCount > 0 },
    { label: "Featured", value: featuredCount, icon: Star },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <AdminSubnav tabs={[{ label: "Products", href: "/admin/products" }, { label: "Categories", href: "/admin/categories" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Tags size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            These power the storefront menus, home grid and the product category picker.
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
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
                <c.icon
                  size={18}
                  className={c.accent ? "text-accent" : c.warn ? "text-amber-600" : "text-faint"}
                />
                <div className={`mt-3 text-xl font-bold tracking-tight ${c.warn ? "text-amber-600" : ""}`}>
                  {c.value}
                </div>
                <div className="tech-label mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <CategoryReorderList
              items={categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                tagline: c.tagline,
                art: c.art,
                image: c.image ?? null,
                hidden: c.hidden,
                featured: c.featured,
                productCount: counts[c.slug] ?? 0,
                revenue: revenue[c.slug] ?? 0,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
