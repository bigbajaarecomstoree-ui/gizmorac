// Maps an Amazon Seller Central listings report (the tab-separated .txt from
// Reports → Inventory → "All / Active Listings Report") onto GIZMORAC products.
//
// No scraping, no API — the merchant exports their own listings and we parse the
// columns we recognise (by header name, so column order doesn't matter). Images
// and videos are intentionally NOT imported (the seller uploads those in admin).

export interface AmazonProductRecord {
  name: string;
  slug: string;
  sku: string;
  asin: string | null;
  category: string;
  art: string;
  price: number;
  mrp: number;
  stock: number;
  shortDescription: string;
  description: string;
  active: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  isDeal: boolean;
}

export interface AmazonImportParse {
  records: AmazonProductRecord[];
  skipped: number;
  total: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Best-effort category from the listing title — the seller can fix it in admin. */
export function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(tyre|tire|car ?play|android auto|dash ?cam|vehicle|inflatable bed|air mattress|puncture|car )/.test(n))
    return "car-accessories";
  if (/(blood pressure|\bbp\b|oximeter|oxygen|massager|toothbrush|callus|\bfoot\b|period|cramp|menstrual|knee|heating pad|physiotherapy|detox|health|eye massager)/.test(n))
    return "health-devices";
  if (/(printer|label|billing|barcode)/.test(n)) return "office-solutions";
  if (/(mouse|keyboard|usb hub|usb-c hub|docking|dock|\bhub\b)/.test(n))
    return "computer-accessories";
  if (/(microphone|\bmic\b|lapel|collar mic|stylus|pencil|selfie|magsafe|earbud|airpod)/.test(n))
    return "mobile-accessories";
  if (/(projector|smart)/.test(n)) return "smart-gadgets";
  return "smart-gadgets";
}

/** Best-effort fallback illustration (only shown until a real photo is uploaded). */
export function guessArt(name: string, category: string): string {
  const n = name.toLowerCase();
  if (/(tyre|tire|inflator|inflatable|air mattress|air bed)/.test(n)) return "inflator";
  if (/(blood pressure|bp monitor|bp machine)/.test(n)) return "bp-monitor";
  if (/(oximeter|oxygen)/.test(n)) return "oximeter";
  if (/knee/.test(n)) return "knee-massager";
  if (/eye ?massager/.test(n)) return "eye-massager";
  if (/(neck|period|cramp|menstrual|heating pad|massager)/.test(n)) return "neck-massager";
  if (/(printer|label|barcode|billing)/.test(n)) return "printer";
  if (/mouse/.test(n)) return "mouse";
  if (/keyboard/.test(n)) return "keyboard";
  if (/(usb hub|usb-c hub|docking|dock|\bhub\b)/.test(n)) return "usb-hub";
  if (/(microphone|\bmic\b|lapel|selfie|projector|dash ?cam|camera|webcam)/.test(n)) return "webcam";
  if (/(car ?play|android auto|mount|dash)/.test(n)) return "mount";
  if (/(stylus|pencil|charger|cable|adapter)/.test(n)) return "charger";
  if (/(toothbrush|callus|\bfoot\b|vacuum|cleaner)/.test(n)) return "vacuum";
  const byCat: Record<string, string> = {
    "car-accessories": "mount",
    "health-devices": "bp-monitor",
    "office-solutions": "printer",
    "computer-accessories": "usb-hub",
    "mobile-accessories": "charger",
    "smart-gadgets": "webcam",
  };
  return byCat[category] ?? "charger";
}

/** A clean one-line summary from the long description. */
function shortDescription(desc: string, name: string): string {
  const src = (desc || name).replace(/\s+/g, " ").trim();
  if (src.length <= 150) return src;
  const dot = src.indexOf(". ");
  if (dot >= 30 && dot <= 170) return src.slice(0, dot + 1).trim();
  return src.slice(0, 147).replace(/\s+\S*$/, "").trim() + "…";
}

/** Parse a tab-separated Amazon report into rows keyed by (lowercased) header. */
function parseRows(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split("\t")
    .map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const rec: Record<string, string> = {};
    headers.forEach((h, k) => {
      rec[h] = (cols[k] ?? "").trim();
    });
    rows.push(rec);
  }
  return rows;
}

export function mapAmazonReportToProducts(text: string): AmazonImportParse {
  const rows = parseRows(text);
  const records: AmazonProductRecord[] = [];
  const usedSlugs = new Set<string>();
  let skipped = 0;

  for (const r of rows) {
    const name = (r["item-name"] || "").trim();
    const price = Math.round(Number(r["price"]));
    if (!name || !Number.isFinite(price) || price <= 0) {
      skipped += 1;
      continue;
    }

    const asin = (r["asin1"] || r["product-id"] || "").trim() || null;

    let mrp = Math.round(Number(r["maximum-retail-price"]));
    if (!Number.isFinite(mrp) || mrp < price) mrp = price;

    const qtyRaw = (r["quantity"] || "").trim();
    let stock = Math.round(Number(qtyRaw));
    // FBA listings don't carry quantity in this report — seed a sellable default
    // the merchant corrects in admin → Inventory.
    if (qtyRaw === "" || !Number.isFinite(stock)) stock = 50;
    stock = Math.max(0, stock);

    const description = (r["item-description"] || "").trim();
    const category = guessCategory(name);
    const status = (r["status"] || "").toLowerCase();
    const active = !/inactive|incomplete/.test(status);

    let base = slugify(name).slice(0, 70).replace(/-+$/, "");
    if (!base) base = slugify(asin ?? "") || "product";
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);

    records.push({
      name,
      slug,
      sku: (r["seller-sku"] || "").trim(),
      asin,
      category,
      art: guessArt(name, category),
      price,
      mrp,
      stock,
      description,
      shortDescription: shortDescription(description, name),
      active,
      isBestSeller: false,
      isFeatured: false,
      isDeal: false,
    });
  }

  // Surface a starter homepage: flag the biggest discounts as best-sellers /
  // featured, and the single best in-stock deal as Deal of the Day. The seller
  // can change all of these flags per product in admin.
  const ranked = records
    .map((rec, i) => ({ i, pct: rec.mrp > 0 ? (rec.mrp - rec.price) / rec.mrp : 0 }))
    .sort((a, b) => b.pct - a.pct);
  ranked.slice(0, 8).forEach(({ i }) => (records[i].isBestSeller = true));
  ranked.slice(0, 6).forEach(({ i }) => (records[i].isFeatured = true));
  const deal = ranked.find(({ i }) => records[i].stock > 0 && records[i].active) ?? ranked[0];
  if (deal) records[deal.i].isDeal = true;

  return { records, skipped, total: rows.length };
}
