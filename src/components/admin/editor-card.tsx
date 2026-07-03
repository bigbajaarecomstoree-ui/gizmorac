"use client";

import * as React from "react";
import { StickyNote, Truck, Loader2, Check } from "lucide-react";

const ICONS = { note: StickyNote, truck: Truck };

/** Card with one editable text field, a dirty-checked Save and a transient tick. */
export function EditorCard({
  icon,
  title,
  hint,
  placeholder,
  saveLabel,
  rows,
  id,
  initial,
  action,
}: {
  icon: keyof typeof ICONS;
  title: string;
  hint: string;
  placeholder: string;
  saveLabel: string;
  /** Render a textarea with this many rows; omit for a single-line input. */
  rows?: number;
  id: string;
  initial: string;
  action: (id: string, value: string) => Promise<{ ok: boolean }>;
}) {
  const [value, setValue] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const dirty = value !== initial;
  const Icon = ICONS[icon];

  const fieldProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(e.target.value);
      setSaved(false);
    },
    placeholder,
  };
  const saveButton = (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await action(id, value);
          setSaved(true);
        })
      }
      disabled={pending || !dirty}
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : null} {saveLabel}
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon size={16} className="text-accent" /> {title}
      </h2>
      <p className={rows ? "mb-2 text-xs text-faint" : "mb-3 text-xs text-faint"}>{hint}</p>
      {rows ? (
        <>
          <textarea
            {...fieldProps}
            rows={rows}
            className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
          />
          <div className="mt-2 flex items-center gap-3">
            {saveButton}
            {saved && !dirty ? (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check size={13} /> Saved
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            {...fieldProps}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none transition-colors focus:border-accent"
          />
          {saveButton}
          {saved && !dirty ? <Check size={15} className="text-success" /> : null}
        </div>
      )}
    </div>
  );
}
