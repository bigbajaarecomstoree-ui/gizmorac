"use client";

import { Trash2 } from "lucide-react";
import { deleteCategory } from "@/lib/admin/actions";

export function DeleteCategoryButton({
  id,
  name,
  productCount,
}: {
  id: string;
  name: string;
  productCount: number;
}) {
  const warning =
    productCount > 0
      ? `Delete “${name}”? ${productCount} product${productCount === 1 ? "" : "s"} still use this category and will keep its tag. This cannot be undone.`
      : `Delete “${name}”? This cannot be undone.`;
  return (
    <form
      action={deleteCategory}
      onSubmit={(e) => {
        if (!confirm(warning)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Delete ${name}`}
        className="inline-grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger cursor-pointer"
      >
        <Trash2 size={15} />
      </button>
    </form>
  );
}
