import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createProduct } from "@/lib/admin/actions";
import { getCategories } from "@/lib/data/queries";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to products
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold tracking-tight">Add product</h1>
      <ProductForm action={createProduct} submitLabel="Create product" categories={categories} />
    </div>
  );
}
