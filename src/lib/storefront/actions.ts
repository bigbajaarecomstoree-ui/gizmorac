"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getSettings } from "@/lib/data/settings";
import { MAX_QTY } from "@/lib/checkout-shared";
import { initiatePayment, getPhonePeConfig } from "@/lib/phonepe";
import { checkServiceability } from "@/lib/shiprocket";
import { cancelOrderEverywhere } from "@/lib/data/order-fulfillment";
import { canCancelOrder, isDisputeWindowOpen, warrantyClaimOpen } from "@/lib/orders-policy";
import { limitByIp } from "@/lib/rate-limit";
import { paymentsProductionSafe } from "@/lib/env-check";
import { logEvent } from "@/lib/data/logs";
import { prorate, rupeesToPaise } from "@/lib/postorder/money";
import {
  validateAndPriceCoupon,
  type CouponResult,
} from "@/lib/data/coupons";
import {
  createTicket,
  getTicketForOrder,
  getTicketById,
  addTicketMessage,
  setTicketStatus,
  TICKET_CATEGORIES,
} from "@/lib/data/tickets";
import type { TicketCategory } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 15-char GSTIN: 2-digit state + 10-char PAN + entity + 'Z' + checksum.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

export interface CartLineRef {
  id: string;
  qty: number;
}

export interface CheckoutPayload {
  items: CartLineRef[];
  couponCode?: string;
  /** Claimed instant promo-popup offer; re-validated against store settings. */
  instantOffer?: "browse" | "cart";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  /** Optional buyer GSTIN for a business invoice. */
  gstin?: string;
  /** Registered company name — required when a GSTIN is given. */
  companyName?: string;
  /** "COD" (default) or "PhonePe" online payment. */
  paymentMethod?: "COD" | "PhonePe";
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; trackingToken: string; paymentMethod: "COD" | "PhonePe" }
  | { ok: false; error: string };

/** Fetch authoritative prices for a set of cart line refs. */
async function resolveLines(refs: CartLineRef[]) {
  const ids = refs.map((r) => r.id);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
  });
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
    const qty = Math.max(1, Math.min(MAX_QTY, Math.round(ref.qty)));
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
  const blocked = await limitByIp("coupon", 20, 60);
  if (blocked) return { ok: false, error: blocked };
  const lines = await resolveLines(refs);
  if (lines.length === 0) return { ok: false, error: "Your cart is empty" };
  return validateAndPriceCoupon(
    code,
    lines.map((l) => ({ price: l.price, qty: l.qty })),
  );
}

/** Thrown inside the checkout transaction to surface a precise, safe message
 *  (and roll the whole order back) when stock or a coupon loses a race. */
class CheckoutError extends Error {}

export async function placeOrder(
  payload: CheckoutPayload,
): Promise<PlaceOrderResult> {
  const blocked = await limitByIp("checkout", 12, 60);
  if (blocked) return { ok: false, error: blocked };
  if ((payload.items?.length ?? 0) > 50) {
    return { ok: false, error: "Too many items in the cart." };
  }
  const lines = await resolveLines(payload.items ?? []);
  if (lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const settings = await getSettings();
  const wantsOnline = payload.paymentMethod === "PhonePe";
  if (wantsOnline && !(await getPhonePeConfig()).configured) {
    return { ok: false, error: "Online payment is unavailable right now." };
  }
  if (!wantsOnline && !settings.codEnabled) {
    return {
      ok: false,
      error: "Cash on Delivery is paused right now. Please pay online instead.",
    };
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
  const gstin = (payload.gstin ?? "").trim().toUpperCase();
  const companyName = (payload.companyName ?? "").trim();
  if (gstin && !GSTIN_RE.test(gstin)) {
    return { ok: false, error: "Please enter a valid 15-character GSTIN, or leave it blank." };
  }
  if (gstin && !companyName) {
    return { ok: false, error: "Please enter the company name for the GST invoice." };
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

  // Instant promo-popup discount — amount comes from store settings (never the
  // client), stacks on top of the coupon, and is capped so the order stays ≥ ₹0.
  let instantDiscount = 0;
  let instantOffer = "";
  if (payload.instantOffer === "browse" && settings.browseOfferEnabled) {
    instantDiscount = settings.browseOfferAmount;
    instantOffer = "browse";
  } else if (payload.instantOffer === "cart" && settings.cartOfferEnabled) {
    instantDiscount = settings.cartOfferAmount;
    instantOffer = "cart";
  }
  instantDiscount = Math.max(
    0,
    Math.min(instantDiscount, subtotal - discount),
  );
  if (instantDiscount <= 0) instantOffer = "";
  const totalDiscount = discount + instantDiscount;

  const afterDiscount = Math.max(0, subtotal - totalDiscount);
  const shipping =
    afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const total = afterDiscount + shipping;

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
  // Unguessable token for the public guest tracking link (32-bit, hex).
  const trackingToken = randomBytes(4).toString("hex").toUpperCase();

  // Post-order v2: per-line money in paise, with order discount/shipping
  // prorated across lines (last/largest bucket absorbs the rounding remainder).
  const lineSubsPaise = lines.map((l) => rupeesToPaise(l.price) * l.qty);
  const discAllocPaise = prorate(rupeesToPaise(totalDiscount), lineSubsPaise);
  const shipAllocPaise = prorate(rupeesToPaise(shipping), lineSubsPaise);
  const v2OrderStatus = wantsOnline ? "PENDING" : "CONFIRMED";

  try {
    await prisma.$transaction(async (tx) => {
      const stockAfter = new Map<string, number>();
      for (const l of lines) {
        // Atomic guard: only decrement when enough stock is still on hand. This
        // is the backstop against overselling under concurrent checkouts (the
        // pre-check above can race). updateMany lets us put `stock` in WHERE.
        const dec = await tx.product.updateMany({
          where: { id: l.id, stock: { gte: l.qty } },
          data: { stock: { decrement: l.qty } },
        });
        if (dec.count === 0) {
          throw new CheckoutError(
            `Sorry, ${l.name} just sold out or doesn't have enough stock left. Please adjust your cart.`,
          );
        }
        const fresh = await tx.product.findUnique({
          where: { id: l.id },
          select: { stock: true },
        });
        stockAfter.set(l.id, fresh?.stock ?? 0);
      }
      if (appliedCode) {
        // Atomic redemption: increment only while under the usage limit, so
        // concurrent orders can't push a single-use coupon past its cap (TOCTOU).
        const lim = await tx.coupon.findUnique({
          where: { code: appliedCode },
          select: { usageLimit: true },
        });
        const claim = await tx.coupon.updateMany({
          where: {
            code: appliedCode,
            ...(lim && lim.usageLimit > 0
              ? { usedCount: { lt: lim.usageLimit } }
              : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (claim.count === 0) {
          throw new CheckoutError("This coupon has reached its usage limit.");
        }
      }
      const order = await tx.order.create({
        data: {
          orderNumber,
          trackingToken,
          // COD auto-confirms; online orders stay Pending until payment clears.
          status: wantsOnline ? "Pending" : "Confirmed",
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim(),
          address: payload.address.trim(),
          city: payload.city.trim(),
          state: payload.state.trim(),
          pincode: payload.pincode.trim(),
          gstin,
          companyName: gstin ? companyName : "",
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
          discount: totalDiscount,
          instantDiscount,
          instantOffer,
          shipping,
          total,
          paymentMethod: wantsOnline ? "PhonePe" : "COD",
          paymentStatus: wantsOnline ? "Pending" : "",
          couponCode: appliedCode,
          customerId: customer?.id ?? null,
          // Post-order v2 (shadow until ffPostOrderV2 flips reads to it).
          statusV2: v2OrderStatus as never,
          paymentState: "PENDING",
          refundState: "NOT_APPLICABLE",
          subtotalPaise: rupeesToPaise(subtotal),
          discountPaise: rupeesToPaise(totalDiscount),
          instantDiscountPaise: rupeesToPaise(instantDiscount),
          shippingPaise: rupeesToPaise(shipping),
          totalPaise: rupeesToPaise(total),
          amountPaidPaise: 0,
        },
      });

      // v2 order_items (operational source of truth) + SALE inventory ledger.
      for (let idx = 0; idx < lines.length; idx++) {
        const l = lines[idx];
        await tx.orderItem.create({
          data: {
            id: `${order.id}-itm-${idx}`,
            orderId: order.id,
            productId: l.id,
            productSlug: l.slug,
            name: l.name,
            qty: l.qty,
            unitPricePaise: rupeesToPaise(l.price),
            lineSubtotalPaise: lineSubsPaise[idx],
            allocatedDiscountPaise: discAllocPaise[idx],
            allocatedShippingPaise: shipAllocPaise[idx],
            netPaidPaise: lineSubsPaise[idx] - discAllocPaise[idx] + shipAllocPaise[idx],
            status: "ACTIVE",
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: l.id,
            delta: -l.qty,
            type: "SALE",
            stockAfter: stockAfter.get(l.id) ?? 0,
            orderId: order.id,
            reason: "order placed",
            idempotencyKey: `${order.id}-sale-${l.id}`,
          },
        });
      }

      // Audit baseline for the new order.
      await tx.orderStatusHistory.create({
        data: {
          entityType: "ORDER",
          entityId: order.id,
          orderId: order.id,
          previousState: "",
          newState: v2OrderStatus,
          actorRole: "SYSTEM",
          reason: "order placed",
        },
      });

      // Save the shipping details back to the logged-in customer's profile so
      // "Profile & address" reflects what they entered at checkout.
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            phone: payload.phone.trim(),
            address: payload.address.trim(),
            city: payload.city.trim(),
            state: payload.state.trim(),
            pincode: payload.pincode.trim(),
          },
        });
      }
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not place order, please try again." };
  }

  await logEvent({
    actor: "customer",
    actorEmail: payload.email.trim(),
    action: "order.placed",
    message: `Order ${orderNumber} placed · ₹${total} · ${wantsOnline ? "PhonePe" : "COD"}`,
    meta: { orderNumber, total, payment: wantsOnline ? "PhonePe" : "COD" },
  });

  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/inventory");
  return {
    ok: true,
    orderNumber,
    trackingToken,
    paymentMethod: wantsOnline ? "PhonePe" : "COD",
  };
}

export type DeliveryEstimateResult =
  | { ok: true; serviceable: boolean; days: number; etd: string; codAvailable: boolean }
  | { ok: false };

/**
 * Delivery ETA + serviceability for a pincode at checkout (via Shiprocket).
 * Returns { ok: false } when Shiprocket isn't connected or the pin is invalid,
 * so the UI can simply hide the estimate.
 */
export async function getDeliveryEstimate(
  pincode: string,
): Promise<DeliveryEstimateResult> {
  const blocked = await limitByIp("delivery-est", 20, 60);
  if (blocked) return { ok: false };
  if (!/^\d{6}$/.test(pincode)) return { ok: false };
  const est = await checkServiceability({ deliveryPincode: pincode });
  if (!est) return { ok: false };
  return { ok: true, ...est };
}

export type StartPaymentResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Start a PhonePe payment for a placed (Pending) online order and return the
 * hosted-checkout redirect URL. The callback verifies the result server-side.
 */
export async function startPhonePePayment(
  orderNumber: string,
  token = "",
): Promise<StartPaymentResult> {
  const blocked = await limitByIp("pay-start", 12, 60);
  if (blocked) return { ok: false, error: blocked };
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return { ok: false, error: "Order not found." };
  // Authorize: the signed-in account owner, or anyone holding the unguessable
  // tracking token (guests have no session). An order number alone is not enough.
  const payer = await getCurrentCustomer();
  const isOwner = Boolean(
    payer &&
      (order.customerId === payer.id ||
        order.email.toLowerCase() === payer.email.toLowerCase()),
  );
  const tokenOk = order.trackingToken !== "" && token === order.trackingToken;
  if (!isOwner && !tokenOk) return { ok: false, error: "Order not found." };
  if (order.paymentStatus === "Paid") {
    return { ok: false, error: "This order is already paid." };
  }

  // Safety guard: never run a customer through a sandbox gateway in production.
  const cfg = await getPhonePeConfig();
  if (!paymentsProductionSafe(cfg.env)) {
    await logEvent({
      level: "error",
      actor: "system",
      action: "payment.misconfigured",
      message: `Blocked online payment: PhonePe is in sandbox on a production deployment (order ${orderNumber}).`,
      meta: { orderNumber, env: cfg.env },
    });
    return {
      ok: false,
      error: "Online payment is temporarily unavailable. Please choose Cash on Delivery.",
    };
  }

  const h = await headers();
  const host = h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host && host.includes("localhost") ? "http" : "https");
  const origin = host
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const redirectUrl = `${origin}/api/payments/phonepe/callback?order=${encodeURIComponent(orderNumber)}`;

  const res = await initiatePayment({
    merchantOrderId: orderNumber,
    amountPaise: order.total * 100,
    redirectUrl,
  });
  if (!res.ok || !res.redirectUrl) {
    return { ok: false, error: res.error ?? "Could not start payment." };
  }
  if (res.orderId) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentRef: res.orderId },
    });
  }
  return { ok: true, redirectUrl: res.redirectUrl };
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Save a customer's rating + feedback for one product on a delivered order.
 * One review per product per order (re-submitting edits the existing one).
 */
export async function submitReview(input: {
  orderNumber: string;
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<ReviewResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in to leave a review." };

  const order = await prisma.order.findUnique({
    where: { orderNumber: input.orderNumber },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const owns =
    order.customerId === customer.id ||
    order.email.toLowerCase() === customer.email.toLowerCase();
  if (!owns) return { ok: false, error: "You can only review your own orders." };
  if (order.status !== "Delivered") {
    return { ok: false, error: "You can review items once your order is delivered." };
  }

  let items: { id: string; slug: string; name: string }[] = [];
  try {
    items = JSON.parse(order.items);
  } catch {
    items = [];
  }
  const line = items.find((i) => i.id === input.productId);
  if (!line) return { ok: false, error: "That product isn't in this order." };

  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  if (!rating) return { ok: false, error: "Please select a star rating." };
  const title = (input.title ?? "").trim().slice(0, 120);
  const body = (input.body ?? "").trim().slice(0, 2000);
  const location = [order.city, order.state].filter(Boolean).join(", ");
  const author =
    customer.fullName.trim() ||
    `${order.firstName} ${order.lastName}`.trim() ||
    "Verified buyer";

  await prisma.review.upsert({
    where: { orderId_productId: { orderId: order.id, productId: input.productId } },
    update: { rating, title, body, author, location },
    create: {
      productId: input.productId,
      productSlug: line.slug,
      orderId: order.id,
      customerId: customer.id,
      author,
      location,
      rating,
      title,
      body,
      verified: true,
    },
  });

  // Keep the product's displayed rating + count honest once real reviews exist.
  const agg = await prisma.review.aggregate({
    where: { productId: input.productId },
    _avg: { rating: true },
    _count: true,
  });
  if (agg._count > 0 && agg._avg.rating != null) {
    await prisma.product.update({
      where: { id: input.productId },
      data: {
        rating: Math.round(agg._avg.rating * 10) / 10,
        reviewCount: agg._count,
      },
    });
  }

  revalidatePath(`/product/${line.slug}`);
  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/account");
  return { ok: true };
}

// --- support tickets (damage / defect claims) ---

export type TicketResult =
  | { ok: true; ticketNumber: string }
  | { ok: false; error: string };

const MAX_ATTACHMENTS = 6;

function cleanAttachments(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u): u is string => typeof u === "string" && u.length > 0)
    .slice(0, MAX_ATTACHMENTS);
}

/** Customer raises a damage/defect ticket against a delivered order. */
export async function raiseTicket(input: {
  orderNumber: string;
  category: string;
  description: string;
  attachments?: string[];
}): Promise<TicketResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in to report a problem." };

  const order = await prisma.order.findUnique({
    where: { orderNumber: input.orderNumber },
  });
  if (!order) return { ok: false, error: "Order not found." };
  const owns =
    order.customerId === customer.id ||
    order.email.toLowerCase() === customer.email.toLowerCase();
  if (!owns) {
    return { ok: false, error: "You can only report problems on your own orders." };
  }
  if (order.status !== "Delivered") {
    return {
      ok: false,
      error: "You can report a problem once your order is delivered.",
    };
  }
  if (input.category === "Warranty") {
    // Warranty claims are allowed for the product's whole warranty window
    // (not the 48h dispute window), and only if an item carries warranty.
    let itemIds: string[] = [];
    try {
      const arr = JSON.parse(order.items);
      if (Array.isArray(arr)) itemIds = arr.map((i) => i?.id).filter(Boolean);
    } catch {}
    const prods = itemIds.length
      ? await prisma.product.findMany({
          where: { id: { in: itemIds } },
          select: { warrantyMonths: true },
        })
      : [];
    const maxWarranty = Math.max(0, ...prods.map((p) => p.warrantyMonths));
    if (!warrantyClaimOpen(order.status, order.deliveredAt, maxWarranty)) {
      return {
        ok: false,
        error:
          "This order isn't eligible for a warranty claim — no item is under warranty, or the warranty period has ended.",
      };
    }
  } else if (!isDisputeWindowOpen(order.status, order.deliveredAt)) {
    return {
      ok: false,
      error: "The 48-hour window to raise a dispute has closed for this order.",
    };
  }

  const existing = await getTicketForOrder(order.id);
  if (existing) {
    return {
      ok: false,
      error: "You've already raised a ticket for this order. Open it to add details.",
    };
  }

  // All three are compulsory to raise a claim: a chosen issue, a description,
  // and at least one photo/video as proof.
  if (!(TICKET_CATEGORIES as string[]).includes(input.category)) {
    return { ok: false, error: "Please select what went wrong." };
  }
  const category = input.category as TicketCategory;
  const description = (input.description ?? "").trim().slice(0, 4000);
  if (!description) return { ok: false, error: "Please describe the problem." };
  const attachments = cleanAttachments(input.attachments);
  if (attachments.length === 0) {
    return {
      ok: false,
      error: "Please add at least one photo or video as proof of the issue.",
    };
  }

  const ticket = await createTicket({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: customer.id,
    email: order.email,
    name: `${order.firstName} ${order.lastName}`.trim() || customer.fullName,
    category,
    description,
    attachments,
  });

  await logEvent({
    level: "warn",
    actor: "customer",
    actorId: customer.id,
    actorEmail: order.email,
    action: "ticket.raised",
    message: `Support ticket ${ticket.ticketNumber} · ${category} · order ${order.orderNumber}`,
    meta: { ticketNumber: ticket.ticketNumber, orderNumber: order.orderNumber, category },
  });

  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/support");
  return { ok: true, ticketNumber: ticket.ticketNumber };
}

export interface CustomerCancelResult {
  ok: boolean;
  message?: string;
  error?: string;
}

/**
 * Customer cancels their own order. Allowed only before the parcel is handed to
 * the courier (Pending / Confirmed / Packed). On success it reverses everything
 * — refunds the payment to the original method and cancels the Shiprocket
 * shipment (freight back to the wallet).
 */
export async function cancelMyOrder(
  orderNumber: string,
): Promise<CustomerCancelResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in to cancel an order." };

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return { ok: false, error: "Order not found." };

  const owns =
    order.customerId === customer.id ||
    order.email.toLowerCase() === customer.email.toLowerCase();
  if (!owns) {
    return { ok: false, error: "You can only cancel your own orders." };
  }
  if (!canCancelOrder(order.status)) {
    return {
      ok: false,
      error:
        order.status === "Cancelled"
          ? "This order is already cancelled."
          : "This order can no longer be cancelled — it's already on its way.",
    };
  }

  const res = await cancelOrderEverywhere(order.id);
  if (!res.ok) {
    return { ok: false, error: res.error ?? "Couldn't cancel the order. Please try again." };
  }

  await logEvent({
    actor: "customer",
    actorId: customer.id,
    actorEmail: order.email,
    action: "order.cancelled",
    message: `Order ${order.orderNumber} cancelled by customer. ${res.note}`,
    meta: { orderNumber: order.orderNumber },
  });

  revalidatePath("/account");
  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: res.note };
}

/** Customer adds a reply / uploads requested proof to their own ticket. */
export async function replyToTicket(input: {
  ticketId: string;
  body?: string;
  attachments?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in." };

  const ticket = await getTicketById(input.ticketId);
  if (!ticket) return { ok: false, error: "Ticket not found." };
  const owns =
    ticket.customerId === customer.id ||
    ticket.email.toLowerCase() === customer.email.toLowerCase();
  if (!owns) return { ok: false, error: "This isn't your ticket." };
  if (ticket.status === "Resolved" || ticket.status === "Rejected") {
    return { ok: false, error: "This ticket is closed." };
  }

  const body = (input.body ?? "").trim().slice(0, 4000);
  const attachments = cleanAttachments(input.attachments);
  if (!body && attachments.length === 0) {
    return { ok: false, error: "Add a message or attach a photo/video." };
  }

  await addTicketMessage({
    ticketId: ticket.id,
    author: "customer",
    body,
    attachments,
  });
  // Replying to a proof request moves the ticket back for the store to review.
  if (ticket.status === "Awaiting proof") {
    await setTicketStatus(ticket.id, "Under review");
  }

  revalidatePath(`/order/${ticket.orderNumber}`);
  revalidatePath(`/admin/support/${ticket.id}`);
  revalidatePath("/admin/support");
  return { ok: true };
}

export type SubscribeResult = { ok: boolean; error?: string };

export async function subscribeNewsletter(
  email: string,
  source = "footer",
): Promise<SubscribeResult> {
  const blocked = await limitByIp("newsletter", 5, 300);
  if (blocked) return { ok: false, error: blocked };
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const src = String(source || "footer").slice(0, 40);
  await prisma.subscriber.upsert({
    where: { email: clean },
    update: {},
    create: { email: clean, source: src },
  });
  return { ok: true };
}
