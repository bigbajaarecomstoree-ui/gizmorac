"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  validateAndPriceCoupon,
  type CouponResult,
} from "@/lib/data/coupons";

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 79;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CartLineRef {
  id: string;
  qty: number;
}

export interface CheckoutPayload {
  items: CartLineRef[];
  couponCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

/** Fetch authoritative prices for a set of cart line refs. */
async function resolveLines(refs: CartLineRef[]) {
  const ids = refs.map((r) => r.id);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: {
    id: string;
    slug: string;
    name: string;
    price: number;
    qty: number;
    stock: number;
  }[] = [];
  for (const ref of refs) {
    const p = byId.get(ref.id);
    if (!p) continue;
    const qty = Math.max(1, Math.min(10, Math.round(ref.qty)));
    lines.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      qty,
      stock: p.stock,
    });
  }
  return lines;
}

/** Coupon validation used by the cart preview — prices come from the DB. */
export async function applyCoupon(
  code: string,
  refs: CartLineRef[],
): Promise<CouponResult> {
  const lines = await resolveLines(refs);
  if (lines.length === 0) return { ok: false, error: "Your cart is empty" };
  return validateAndPriceCoupon(
    code,
    lines.map((l) => ({ price: l.price, qty: l.qty })),
  );
}

export async function placeOrder(
  payload: CheckoutPayload,
): Promise<PlaceOrderResult> {
  const lines = await resolveLines(payload.items ?? []);
  if (lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  // Required shipping details.
  const required: [keyof CheckoutPayload, string][] = [
    ["firstName", "first name"],
    ["lastName", "last name"],
    ["email", "email"],
    ["phone", "phone number"],
    ["address", "address"],
    ["city", "city"],
    ["state", "state"],
    ["pincode", "pincode"],
  ];
  for (const [key, label] of required) {
    if (!String(payload[key] ?? "").trim()) {
      return { ok: false, error: `Please enter your ${label}.` };
    }
  }
  if (!EMAIL_RE.test(payload.email.trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!/^\d{6}$/.test(payload.pincode.trim())) {
    return { ok: false, error: "Please enter a valid 6-digit pincode." };
  }
  if (!/^\d{10}$/.test(payload.phone.replace(/\D/g, ""))) {
    return { ok: false, error: "Please enter a valid 10-digit phone number." };
  }

  // Stock check (authoritative).
  for (const l of lines) {
    if (l.qty > l.stock) {
      return {
        ok: false,
        error: `Only ${l.stock} left of ${l.name}. Please adjust your cart.`,
      };
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);

  // Coupon (recomputed server-side; never trust a client-sent discount).
  let discount = 0;
  let appliedCode: string | null = null;
  if (payload.couponCode?.trim()) {
    const result = await validateAndPriceCoupon(
      payload.couponCode,
      lines.map((l) => ({ price: l.price, qty: l.qty })),
    );
    if (result.ok && result.discount) {
      discount = result.discount;
      appliedCode = result.code ?? null;
    }
  }

  const afterCoupon = Math.max(0, subtotal - discount);
  const shipping = afterCoupon >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = afterCoupon + shipping;

  const customer = await getCurrentCustomer();

  // Generate a unique order number (retry on the rare collision).
  let orderNumber = "";
  for (let i = 0; i < 5; i++) {
    const candidate = `GZ-${Math.floor(100000 + Math.random() * 900000)}`;
    const clash = await prisma.order.findUnique({
      where: { orderNumber: candidate },
    });
    if (!clash) {
      orderNumber = candidate;
      break;
    }
  }
  if (!orderNumber) {
    return { ok: false, error: "Could not place order, please try again." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const l of lines) {
        await tx.product.update({
          where: { id: l.id },
          data: { stock: { decrement: l.qty } },
        });
      }
      if (appliedCode) {
        await tx.coupon.updateMany({
          where: { code: appliedCode },
          data: { usedCount: { increment: 1 } },
        });
      }
      await tx.order.create({
        data: {
          orderNumber,
          status: "Pending",
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim(),
          address: payload.address.trim(),
          city: payload.city.trim(),
          state: payload.state.trim(),
          pincode: payload.pincode.trim(),
          items: JSON.stringify(
            lines.map((l) => ({
              id: l.id,
              slug: l.slug,
              name: l.name,
              price: l.price,
              qty: l.qty,
            })),
          ),
          subtotal,
          discount,
          shipping,
          total,
          paymentMethod: "COD",
          couponCode: appliedCode,
          customerId: customer?.id ?? null,
        },
      });
    });
  } catch {
    return { ok: false, error: "Could not place order, please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/inventory");
  return { ok: true, orderNumber };
}

export type SubscribeResult = { ok: boolean; error?: string };

export async function subscribeNewsletter(
  email: string,
): Promise<SubscribeResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  await prisma.subscriber.upsert({
    where: { email: clean },
    update: {},
    create: { email: clean },
  });
  return { ok: true };
}
