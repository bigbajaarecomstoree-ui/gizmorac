import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllProducts, getCategories } from "@/lib/data/queries";
import { buttonVariants } from "@/components/ui/button";
import { ProductImportExport } from "@/components/admin/product-import-export";
import { ProductsTable } from "@/components/admin/products-table";
import { AdminSubnav } from "@/components/admin/admin-subnav";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);
  const CATEGORY_NAME = Object.fromEntries(
    categories.map((c) => [c.slug, c.name]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <AdminSubnav tabs={[{ label: "Products", href: "/admin/products" }, { label: "Categories", href: "/admin/categories" }]} />
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

      <div className="mt-5">
        <ProductImportExport />
      </div>

      <div className="mt-5">
        <ProductsTable products={products} categoryNames={CATEGORY_NAME} />
      </div>
    </div>
  );
}
