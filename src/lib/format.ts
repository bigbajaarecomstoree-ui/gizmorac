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
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const start = new Date();
  start.setDate(start.getDate() + fromDays);
  const end = new Date();
  end.setDate(end.getDate() + toDays);
  return `${fmt(start)} – ${fmt(end)}`;
}
