"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Trash2, TriangleAlert, Loader2 } from "lucide-react";
import { deleteProduct } from "@/lib/admin/actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-60 cursor-pointer"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}

export function DeleteProductDialog({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${name}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger cursor-pointer"
      >
        <Trash2 size={15} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
        >
          {/* blurred backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-foreground/25 backdrop-blur-sm"
          />

          <div className="animate-pop relative w-full max-w-sm rounded-2xl border border-border bg-elevated p-6 text-center shadow-2xl">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
              <TriangleAlert size={24} />
            </span>
            <h2 id="delete-product-title" className="mt-4 text-lg font-bold tracking-tight">
              Delete this product?
            </h2>
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-foreground">{name}</span> is going
              to be deleted permanently. Do you want to delete this product?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-border-bright px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 cursor-pointer"
              >
                No, keep it
              </button>
              <form action={deleteProduct} className="flex flex-1">
                <input type="hidden" name="id" value={id} />
                <ConfirmButton />
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
