"use client";

import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/admin/actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteProduct}
      onSubmit={(e) => {
        if (!confirm(`Delete “${name}”? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 cursor-pointer"
      >
        <Trash2 size={15} />
        Delete product
      </button>
    </form>
  );
}
