"use client";

import * as React from "react";
import { StickyNote, Loader2, Check } from "lucide-react";
import { saveAdminNotes } from "@/lib/admin/actions";

/** Internal staff-only notes on an order — never shown to the customer. */
export function AdminNotes({ orderId, initial }: { orderId: string; initial: string }) {
  const [notes, setNotes] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const dirty = notes !== initial;

  function save() {
    setSaved(false);
    start(async () => {
      await saveAdminNotes(orderId, notes);
      setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <StickyNote size={16} className="text-accent" /> Internal notes
      </h2>
      <p className="mb-2 text-xs text-faint">Private to staff — never shown to the customer.</p>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={4}
        placeholder="e.g. Customer requested late delivery · High-value customer · Verify address"
        className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save notes
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
