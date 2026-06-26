import type { ProductSpec } from "@/lib/types";

/**
 * Clean a product's specs into proper {label, value} rows. Tolerates specs that
 * were pasted as a Markdown table (each line stored as a label with no value):
 * splits "| Label | Value |" into label/value, and drops the header row and the
 * |----|----| separator. Used both at read time (so existing data renders
 * cleanly without a re-save) and in the admin specs editor.
 */
export function normalizeSpecs(
  specs: ProductSpec[] | undefined | null,
): ProductSpec[] {
  if (!Array.isArray(specs)) return [];
  const out: ProductSpec[] = [];

  for (const s of specs) {
    const label = String(s?.label ?? "").trim();
    const value = String(s?.value ?? "").trim();

    // Markdown-table leftover: the whole "| A | B |" row landed in `label`.
    if (!value && label.includes("|")) {
      const cells = label
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length === 0) continue;
      // separator row, e.g. |----|----| or |:--|--:|
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      // header row, e.g. | Specification | Details |
      if (
        cells.length >= 2 &&
        /^specifications?$/i.test(cells[0]) &&
        /^details?$/i.test(cells[1])
      ) {
        continue;
      }
      out.push({
        label: cells[0],
        value: cells.length >= 2 ? cells.slice(1).join(" — ") : "",
      });
      continue;
    }

    if (label || value) out.push({ label, value });
  }

  return out;
}
