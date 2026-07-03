import type { Coupon as CouponRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Coupon, CouponType } from "@/lib/types";

export const COUPON_TYPES: { value: CouponType; label: string }[] = [
  { value: "percent", label: "Percentage off" },
  { value: "fixed", label: "Fixed amount off" },
  { value: "bogo", label: "Buy one, get one free" },
];

export function toCoupon(r: CouponRow): Coupon {
  return {
    id: r.id,
    code: r.code,
    type: r.type as CouponType,
    value: r.value,
    minOrder: r.minOrder,
    maxDiscount: r.maxDiscount,
    active: r.active,
    startsAt: r.startsAt ? r.startsAt.toISOString() : null,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    usageLimit: r.usageLimit,
    usedCount: r.usedCount,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getCoupons(): Promise<Coupon[]> {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toCoupon);
}

export async function getCouponById(id: string): Promise<Coupon | null> {
  const row = await prisma.coupon.findUnique({ where: { id } });
  return row ? toCoupon(row) : null;
}

/** One order that redeemed a coupon — who, when, and how much it saved them. */
export interface CouponRedemption {
  orderId: string;
  orderNumber: string;
  buyer: string;
  email: string;
  createdAt: string;
  /** The coupon's own discount on this order (excludes any instant popup offer). */
  couponDiscount: number;
  orderTotal: number;
  status: string;
}

export interface CouponUsage {
  coupon: Coupon;
  /** "manual" (admin-created) | "reward" (auto-issued repeat-order coupon). */
  kind: string;
  /** For reward coupons: the customer the coupon was issued to. */
  issuedTo: { name: string; email: string } | null;
  redemptions: CouponRedemption[];
}

/** A coupon plus the full list of orders that redeemed it — powers the admin
 * coupon-detail page ("who used this, when, and how many times"). */
export async function getCouponUsage(id: string): Promise<CouponUsage | null> {
  const row = await prisma.coupon.findUnique({ where: { id } });
  if (!row) return null;

  const orders = await prisma.order.findMany({
    where: { couponCode: row.code },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      discount: true,
      instantDiscount: true,
      total: true,
      status: true,
    },
  });

  const redemptions: CouponRedemption[] = orders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    buyer: `${o.firstName} ${o.lastName}`.trim(),
    email: o.email,
    createdAt: o.createdAt.toISOString(),
    couponDiscount: Math.max(0, o.discount - o.instantDiscount),
    orderTotal: o.total,
    status: o.status,
  }));

  let issuedTo: CouponUsage["issuedTo"] = null;
  if (row.kind === "reward" && row.customerId) {
    const c = await prisma.customer.findUnique({
      where: { id: row.customerId },
      select: { fullName: true, email: true },
    });
    if (c) issuedTo = { name: c.fullName, email: c.email };
  }

  return { coupon: toCoupon(row), kind: row.kind, issuedTo, redemptions };
}

export interface CartLineInput {
  price: number;
  qty: number;
}

/** Human-readable summary of what a coupon does. */
export function describeCoupon(c: Coupon): string {
  switch (c.type) {
    case "percent":
      return `${c.value}% off${c.maxDiscount ? ` (up to ₹${c.maxDiscount})` : ""}`;
    case "fixed":
      return `₹${c.value} off`;
    case "bogo":
      return "Buy one, get one free";
    default:
      return c.description || c.code;
  }
}

/** Discount in whole rupees a coupon yields for a given set of cart lines. */
export function computeCouponDiscount(
  c: Coupon,
  items: CartLineInput[],
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  switch (c.type) {
    case "percent": {
      let off = Math.round((subtotal * c.value) / 100);
      if (c.maxDiscount > 0) off = Math.min(off, c.maxDiscount);
      return Math.min(off, subtotal);
    }
    case "fixed":
      return Math.min(c.value, subtotal);
    case "bogo": {
      // Expand to individual units, free the cheapest half (rounded down).
      const units: number[] = [];
      for (const it of items) {
        for (let i = 0; i < it.qty; i++) units.push(it.price);
      }
      units.sort((a, b) => a - b);
      const freeCount = Math.floor(units.length / 2);
      let off = 0;
      for (let i = 0; i < freeCount; i++) off += units[i];
      return Math.min(off, subtotal);
    }
    default:
      return 0;
  }
}

export interface CouponResult {
  ok: boolean;
  code?: string;
  type?: CouponType;
  discount?: number;
  label?: string;
  error?: string;
}

/** Validate a code against the cart and return the computed discount.
 *  `opts.customerId` is the currently signed-in customer (null for guests) —
 *  required to redeem an account-bound reward coupon. */
export async function validateAndPriceCoupon(
  code: string,
  items: CartLineInput[],
  opts: { customerId?: string | null } = {},
): Promise<CouponResult> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: "Enter a coupon code" };

  const row = await prisma.coupon.findUnique({ where: { code: clean } });
  if (!row || !row.active) {
    return { ok: false, error: "Invalid or inactive coupon code" };
  }

  // Reward (loyalty) coupons are bound to the account that earned them: only
  // that signed-in customer may redeem them. Without this, any holder of a
  // `GZ-AGAIN-…` code (shared, leaked, or brute-forced) could burn someone
  // else's reward — validation was previously by code alone.
  if (row.kind === "reward" && (!opts.customerId || row.customerId !== opts.customerId)) {
    return {
      ok: false,
      error:
        "This reward coupon belongs to a different account. Sign in with the account that earned it.",
    };
  }

  const coupon = toCoupon(row);
  const now = new Date();
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { ok: false, error: "This coupon isn't active yet" };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { ok: false, error: "This coupon has expired" };
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has reached its usage limit" };
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  if (subtotal < coupon.minOrder) {
    const gap = coupon.minOrder - subtotal;
    return { ok: false, error: `Add ₹${gap} more to use this coupon` };
  }

  const discount = computeCouponDiscount(coupon, items, subtotal);
  if (discount <= 0) {
    return { ok: false, error: "This coupon doesn't apply to your cart" };
  }

  return {
    ok: true,
    code: coupon.code,
    type: coupon.type,
    discount,
    label: describeCoupon(coupon),
  };
}
