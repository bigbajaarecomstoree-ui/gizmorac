"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

const cell =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

/**
 * Add a simple list of items one row at a time, with a "+ Add" button. Writes a
 * hidden field as newline-separated lines so the server's `lines()` helper parses
 * it unchanged. Used for "In the box" (and reusable for any plain string list).
 */
export function ListEditor({
  name,
  initial = [],
  placeholder = "Add an item",
  addLabel = "Add item",
}: {
  name: string;
  initial?: string[];
  placeholder?: string;
  addLabel?: string;
}) {
  const [rows, setRows] = React.useState<string[]>(() =>
    initial.length ? [...initial] : [""],
  );

  const update = (i: number, v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? v : r)));
  const add = () => setRows((rs) => [...rs, ""]);
  const remove = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [""]));

  const serialized = rows
    .map((r) => r.trim())
    .filter(Boolean)
    .join("\n");

  return (
    <div>
      <input type="hidden" name={name} value={serialized} />

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <input
              value={r}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className={cell}
              aria-label={`Item ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove item ${i + 1}`}
              className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border-bright px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer"
      >
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  );
}
