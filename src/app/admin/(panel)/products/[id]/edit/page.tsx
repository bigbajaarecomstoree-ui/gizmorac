import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductById, getCategories } from "@/lib/data/queries";
import { updateProduct } from "@/lib/admin/actions";
import { ProductForm } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to products
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold tracking-tight">Edit product</h1>

      <ProductForm action={updateProduct} product={product} submitLabel="Save changes" categories={categories} />

      <div className="mt-8 flex items-center justify-between rounded-xl border border-danger/30 bg-danger/5 p-5">
        <div>
          <h3 className="text-sm font-semibold">Danger zone</h3>
          <p className="mt-0.5 text-xs text-muted">
            Permanently remove this product from the store.
          </p>
        </div>
        <DeleteProductButton id={product.id} name={product.name} />
      </div>
    </div>
  );
}
