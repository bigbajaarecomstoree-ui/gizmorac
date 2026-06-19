"use client";

import { Trash2 } from "lucide-react";
import { deleteCoupon } from "@/lib/admin/actions";

export function DeleteCouponButton({ id, code }: { id: string; code: string }) {
  return (
    <form
      action={deleteCoupon}
      onSubmit={(e) => {
        if (!confirm(`Delete coupon “${code}”? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Delete ${code}`}
        className="inline-grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger cursor-pointer"
      >
        <Trash2 size={15} />
      </button>
    </form>
  );
}
