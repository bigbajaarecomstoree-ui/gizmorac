import type { Product } from "@/lib/types";

// Shared column contract for product import/export, so the exported file and the
// sample template can be re-imported without edits. Multi-value fields use "|"
// as the separator (keeps them inside a single CSV cell).
export const PRODUCT_CSV_HEADERS = [
  "name",
  "slug",
  "sku",
  "category",
  "art",
  "price",
  "mrp",
  "cost",
  "stock",
  "lowStockThreshold",
  "rating",
  "reviewCount",
  "shortDescription",
  "description",
  "badges",
  "highlights",
  "features",
  "specs",
  "faqs",
  "isBestSeller",
  "isFeatured",
  "isDeal",
  "active",
  "image",
] as const;

type Cell = string | number | boolean;

export function productToCsvRow(p: Product): Cell[] {
  return [
    p.name,
    p.slug,
    p.sku,
    p.category,
    p.art,
    p.price,
    p.mrp,
    p.cost,
    p.stock,
    p.lowStockThreshold,
    p.rating,
    p.reviewCount,
    p.shortDescription,
    p.description,
    p.badges.join("|"),
    p.highlights.join("|"),
    p.features.join("|"),
    p.specs.map((s) => `${s.label}: ${s.value}`).join("|"),
    p.faqs.map((f) => `${f.q} :: ${f.a}`).join("|"),
    p.isBestSeller,
    p.isFeatured,
    p.isDeal,
    p.active,
    p.image ?? "",
  ];
}

/** Example rows for the downloadable template. */
export const PRODUCT_CSV_SAMPLE: Cell[][] = [
  [
    "GIZMORAC SoundPod Mini Speaker",
    "", // slug — leave blank to auto-generate
    "GZ-SPM-BLK",
    "smart-gadgets",
    "charger",
    1499,
    2499,
    900,
    50,
    10,
    4.6,
    120,
    "Compact Bluetooth speaker with deep bass.",
    "A pocket-sized speaker with 12-hour battery life and IPX5 splash resistance.",
    "Best Seller|New",
    "12-hour battery|IPX5 splash resistant|Bluetooth 5.3",
    "Bluetooth 5.3|Type-C charging|8W output",
    "Battery: 1500mAh|Weight: 220g",
    "Is it waterproof? :: It is IPX5 splash resistant.|Warranty? :: 1 year.",
    false,
    true,
    false,
    true,
    "",
  ],
];

/** Escape one CSV cell (wrap in quotes, double embedded quotes). */
export function csvCell(value: Cell): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Build a CSV string (with UTF-8 BOM so Excel reads it correctly). */
export function buildCsv(rows: Cell[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Minimal RFC-4180 CSV parser (handles quotes, escaped quotes, newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
