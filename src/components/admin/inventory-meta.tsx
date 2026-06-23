"use client";

import * as React from "react";
import { Truck, StickyNote, Loader2, Check } from "lucide-react";
import { saveInventoryNote, saveSupplier } from "@/lib/admin/actions";

/** Editable reorder supplier for a product. */
export function SupplierEditor({ productId, initial }: { productId: string; initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const dirty = value !== initial;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Truck size={16} className="text-accent" /> Supplier
      </h2>
      <p className="mb-3 text-xs text-faint">Where you reorder this product from.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. ABC Electronics"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="button"
          onClick={() =>
            start(async () => {
              await saveSupplier(productId, value);
              setSaved(true);
            })
          }
          disabled={pending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save
        </button>
        {saved && !dirty ? <Check size={15} className="text-success" /> : null}
      </div>
    </div>
  );
}

/** Editable private inventory note for a product. */
export function InventoryNoteEditor({ productId, initial }: { productId: string; initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const dirty = value !== initial;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <StickyNote size={16} className="text-accent" /> Inventory notes
      </h2>
      <p className="mb-2 text-xs text-faint">Private to staff — reorder reminders, supplier delays…</p>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="e.g. Supplier delayed · next shipment Monday"
        className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            start(async () => {
              await saveInventoryNote(productId, value);
              setSaved(true);
            })
          }
          disabled={pending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save note
        </button>
        {saved && !dirty ? (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check size={13} /> Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
