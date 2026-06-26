"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import type { ProductSpec } from "@/lib/types";
import { normalizeSpecs } from "@/lib/data/specs";

const cell =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

/**
 * Add product specs one row at a time — a Specification (label) + Details
 * (value) pair per row, with a "+ Add specification" button. Writes a hidden
 * field as "Label: Value" lines so the existing server action parses it
 * unchanged. Existing markdown-table data is auto-cleaned into rows on load.
 */
export function SpecsEditor({
  name,
  initial = [],
}: {
  name: string;
  initial?: ProductSpec[];
}) {
  const [rows, setRows] = React.useState<ProductSpec[]>(() => {
    const clean = normalizeSpecs(initial);
    return clean.length ? clean : [{ label: "", value: "" }];
  });

  const update = (i: number, key: keyof ProductSpec, val: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  const add = () => setRows((rs) => [...rs, { label: "", value: "" }]);
  const remove = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [{ label: "", value: "" }]));

  // Serialize for the existing `parseSpecs` server helper ("Label: Value" lines).
  const serialized = rows
    .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
    .filter((r) => r.label || r.value)
    .map((r) => `${r.label}: ${r.value}`)
    .join("\n");

  return (
    <div>
      <input type="hidden" name={name} value={serialized} />

      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-1 pb-1.5 text-xs font-medium text-faint">
        <span>Specification</span>
        <span>Details</span>
        <span className="w-8" aria-hidden />
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input
              value={r.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="e.g. Resolution"
              className={cell}
              aria-label={`Specification ${i + 1} label`}
            />
            <input
              value={r.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="e.g. 203 DPI"
              className={cell}
              aria-label={`Specification ${i + 1} value`}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove specification ${i + 1}`}
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
        <Plus size={15} /> Add specification
      </button>
    </div>
  );
}
