import type { Product } from "./types";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹2,499 — Indian digit grouping, no decimals. */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/**
 * A clean, compact title for cards / hero / cart, derived from a long
 * marketplace (Amazon) listing name. The full keyword-rich `name` is kept for
 * the product page + SEO; this is display-only. Cuts at the first natural
 * separator (comma, pipe, bracket, dash, colon) and caps the length.
 */
export function shortTitle(name: string, maxChars = 46): string {
  let s = (name ?? "").replace(/\s+/g, " ").trim();
  // Drop a leading brand / filler word so the noun leads.
  s = s.replace(/^(gizmorac|compatible)\s+/i, "");
  // Cut at the first separator that appears after a meaningful first chunk.
  const sep = s.match(/[,|•(\[\]{}:]|\s[–—-]\s/);
  if (sep && sep.index !== undefined && sep.index >= 8) s = s.slice(0, sep.index);
  s = s.trim();
  const words = s.split(" ");
  if (words.length > 8) s = words.slice(0, 8).join(" ");
  if (s.length > maxChars) {
    s = s.slice(0, maxChars - 1).replace(/\s+\S*$/, "").trim() + "…";
  }
  // Trim a dangling connector/symbol left by truncation (e.g. "…for Car &").
  s = s.replace(/\s*[&/+,–—-]+\s*$/g, "").trim();
  s = s.replace(/\s+(for|with|and|to|in|of|by|the|a|an)$/i, "").trim();
  return s || name;
}

/** Whole-number discount percentage off MRP. */
export function discountPercent(product: Pick<Product, "price" | "mrp">): number {
  if (!product.mrp || product.mrp <= product.price) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

/** Absolute rupee saving vs MRP. */
export function savings(product: Pick<Product, "price" | "mrp">): number {
  return Math.max(0, product.mrp - product.price);
}

/** Compact count, e.g. 1240 -> "1,240" using Indian grouping. */
export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

/** Estimated delivery window from today, returned as a readable range. */
export function deliveryWindow(fromDays = 2, toDays = 5): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  const start = new Date();
  start.setDate(start.getDate() + fromDays);
  const end = new Date();
  end.setDate(end.getDate() + toDays);
  return `${fmt(start)} – ${fmt(end)}`;
}

const TRACK_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "2026-07-23 09:00:00" (Shiprocket timestamps are already IST) → "23 Jul, 9:00 am".
 * Pure string math — never routed through Date, so the server's timezone
 * can't shift courier times.
 */
export function formatTrackingWhen(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(raw || "");
  if (!m) return raw || "";
  const mon = TRACK_MONTHS[Number(m[2]) - 1] ?? "";
  let h = Number(m[4]);
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${Number(m[3])} ${mon}, ${h}:${m[5]} ${ap}`;
}

/** Same source format, date only → "23 Jul 2026" (for the courier's ETD). */
export function formatTrackingDay(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw || "");
  if (!m) return raw || "";
  const mon = TRACK_MONTHS[Number(m[2]) - 1] ?? "";
  return `${Number(m[3])} ${mon} ${m[1]}`;
}
