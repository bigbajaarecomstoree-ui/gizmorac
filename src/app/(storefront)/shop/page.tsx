import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, PackageSearch } from "lucide-react";
import type { CategorySlug, ShopQuery, SortOption } from "@/lib/types";
import {
  getVisibleCategories,
  getCategoryBySlug,
  getCategoryCounts,
  getPriceBounds,
  queryProducts,
} from "@/lib/data/queries";
import { ProductGrid } from "@/components/product/product-grid";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ShopFilters } from "@/components/shop/shop-filters";
import { SortSelect } from "@/components/shop/sort-select";
import { Pagination } from "@/components/shop/pagination";
import { buttonVariants } from "@/components/ui/button";
import type { RawParams } from "@/lib/shop-url";
import { formatCount } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS: SortOption[] = [
  "popular",
  "newest",
  "price-asc",
  "price-desc",
  "rating",
  "discount",
];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toRaw(sp: Record<string, string | string[] | undefined>): RawParams {
  const out: RawParams = {};
  for (const k of ["category", "sort", "minPrice", "maxPrice", "minRating", "availability", "q", "page"]) {
    const v = one(sp[k]);
    if (v) out[k] = v;
  }
  return out;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const cat = one(sp.category);
  const category = cat ? await getCategoryBySlug(cat) : null;
  const title = category ? `${category.name}` : "Shop All Gadgets";
  const description = category
    ? `Shop ${category.name.toLowerCase()} from GIZMORAC — ${category.tagline.toLowerCase()}. Quality-tested and shipped PAN India.`
    : "Browse the full GIZMORAC range of smart gadgets, health devices and accessories. Filter by category, price and rating.";
  return { title, description, alternates: { canonical: "/shop" } };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const raw = toRaw(sp);

  const sort = (SORTS.includes(raw.sort as SortOption) ? raw.sort : "popular") as SortOption;

  const query: ShopQuery = {
    category: raw.category as CategorySlug | undefined,
    sort,
    minPrice: raw.minPrice ? Number(raw.minPrice) : undefined,
    maxPrice: raw.maxPrice ? Number(raw.maxPrice) : undefined,
    minRating: raw.minRating ? Number(raw.minRating) : undefined,
    availability:
      raw.availability === "in" || raw.availability === "out"
        ? raw.availability
        : undefined,
    q: raw.q,
    page: raw.page ? Number(raw.page) : 1,
  };

  const [categories, counts, result, priceBounds] = await Promise.all([
    getVisibleCategories(),
    // Catalog counts per category. The sidebar is category navigation: clicking a
    // category browses it (dropping any active search), so these counts match the
    // products that category will actually show.
    getCategoryCounts(),
    queryProducts(query),
    getPriceBounds(),
  ]);

  const priceFloor = 100;
  const priceCeil = Math.max(priceFloor + 100, Math.ceil(priceBounds.max / 100) * 100);
  const priceValue = raw.maxPrice
    ? Math.min(priceCeil, Math.max(priceFloor, Number(raw.maxPrice)))
    : priceCeil;

  const category = raw.category
    ? await getCategoryBySlug(raw.category)
    : null;

  const heading = category ? category.name : raw.q ? `Results for “${raw.q}”` : "All products";
  const start = (result.page - 1) * result.pageSize + 1;
  const end = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="shell py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(category ? [{ label: category.name }] : []),
        ]}
      />

      <header className="mt-5">
        <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-muted">
          {category?.tagline ??
            "Premium gadgets for productivity, health, travel and everyday life."}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* desktop filters */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <ShopFilters
              params={raw}
              categories={categories}
              counts={counts}
              priceFloor={priceFloor}
              priceCeil={priceCeil}
              priceValue={priceValue}
            />
          </div>
        </aside>

        <div>
          {/* toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {result.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {start}–{end}
                  </span>{" "}
                  of {formatCount(result.total)}
                </>
              ) : (
                "No products found"
              )}
            </p>
            <SortSelect value={sort} params={raw} />
          </div>

          {/* mobile filters */}
          <details className="mt-4 rounded-xl border border-border bg-surface lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal size={16} className="text-accent" />
              Filters
            </summary>
            <div className="border-t border-border p-2">
              <ShopFilters
                params={raw}
                categories={categories}
                counts={counts}
                priceFloor={priceFloor}
                priceCeil={priceCeil}
                priceValue={priceValue}
              />
            </div>
          </details>

          {/* grid */}
          {result.items.length > 0 ? (
            <ProductGrid
              products={result.items}
              className="mt-6 lg:grid-cols-3"
            />
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
              <PackageSearch size={32} className="text-faint" />
              <h2 className="mt-4 text-lg font-semibold">No matches yet</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Try removing a filter or browsing all products.
              </p>
              <Link href="/shop" className={`${buttonVariants({ variant: "outline" })} mt-5`}>
                Clear all filters
              </Link>
            </div>
          )}

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            params={raw}
          />
        </div>
      </div>
    </div>
  );
}
