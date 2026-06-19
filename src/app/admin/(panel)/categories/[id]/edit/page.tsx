import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCategoryById } from "@/lib/data/queries";
import { updateCategory } from "@/lib/admin/actions";
import { CategoryForm } from "@/components/admin/category-form";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Params }) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to categories
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold tracking-tight">Edit category</h1>
      <CategoryForm action={updateCategory} category={category} submitLabel="Save changes" />
    </div>
  );
}
