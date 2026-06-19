import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCategory } from "@/lib/admin/actions";
import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to categories
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold tracking-tight">New category</h1>
      <CategoryForm action={createCategory} submitLabel="Create category" />
    </div>
  );
}
