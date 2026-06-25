"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  checkPassword,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
} from "@/lib/auth";
import { parseCsv } from "@/lib/products-csv";
import { mapAmazonReportToProducts } from "@/lib/amazon-import";
import { issueRepeatCoupon } from "@/lib/data/rewards";
import { verifyPhonePeKeys, type PhonePeEnv } from "@/lib/phonepe";
import {
  verifyShiprocket,
  createShiprocketOrder,
  getTracking,
  fetchPickupPincode,
  shipShipment,
  createReturnOrder,
  shipReturn,
  generateLabels,
  estimateOrderFreight,
} from "@/lib/shiprocket";
import { refundOrderPayment, cancelOrderEverywhere } from "@/lib/data/order-fulfillment";
import { getOrderById } from "@/lib/data/orders";
import { recordShipmentUpdate } from "@/lib/data/shipments";
import { logEvent } from "@/lib/data/logs";
import { limitByIp } from "@/lib/rate-limit";
import { headers } from "next/headers";

async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  } catch {
    return "";
  }
}
import {
  addTicketMessage,
  setTicketStatus,
  setTicketResolution,
  getTicketById,
  TICKET_RESOLUTIONS,
} from "@/lib/data/tickets";
import type { TicketResolution, TicketStatus } from "@/lib/types";

// --- helpers (not exported, so they aren't treated as server actions) ---

/**
 * Defense in depth: every mutating admin action re-checks the session, so a
 * forged direct POST to a Server Action can't bypass the route-level proxy.
 */
async function assertAdmin(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}

function str(fd: FormData, key: string): string {
  return (fd.get(key) ?? "").toString().trim();
}
function int(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}
function num(fd: FormData, key: string, fallback = 0): number {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) != null;
}
function dateOrNull(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function lines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function parseSpecs(value: string) {
  return lines(value).map((l) => {
    const i = l.indexOf(":");
    return i === -1
      ? { label: l, value: "" }
      : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
  });
}
function parseFaqs(value: string) {
  return lines(value).map((l) => {
    const [q, ...a] = l.split("::");
    return { q: q.trim(), a: a.join("::").trim() };
  });
}
/** Read a hidden JSON-array field, e.g. the uploaded image URLs. */
function jsonArray(fd: FormData, key: string): string[] {
  try {
    const v = JSON.parse(str(fd, key) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function productDataFromForm(fd: FormData) {
  const name = str(fd, "name");
  const slug = str(fd, "slug") || slugify(name);
  const images = jsonArray(fd, "images").slice(0, 7);
  const video = str(fd, "video") || null;
  return {
    slug,
    name,
    brand: str(fd, "brand") || "GIZMORAC",
    sku: str(fd, "sku"),
    category: str(fd, "category"),
    art: str(fd, "art") || "printer",
    image: images[0] ?? null,
    images: JSON.stringify(images),
    video,
    price: int(fd, "price"),
    mrp: int(fd, "mrp"),
    cost: int(fd, "cost"),
    hsn: str(fd, "hsn"),
    gstRate: num(fd, "gstRate", 18),
    weightKg: Math.max(0.01, num(fd, "weightKg", 0.5)),
    lengthCm: Math.max(1, int(fd, "lengthCm", 15)),
    breadthCm: Math.max(1, int(fd, "breadthCm", 12)),
    heightCm: Math.max(1, int(fd, "heightCm", 5)),
    rating: num(fd, "rating", 4.5),
    reviewCount: int(fd, "reviewCount"),
    stock: int(fd, "stock"),
    lowStockThreshold: int(fd, "lowStockThreshold", 10),
    warrantyMonths: Math.max(0, int(fd, "warrantyMonths", 0)),
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    badges: JSON.stringify(
      str(fd, "badges")
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
    ),
    highlights: JSON.stringify(lines(str(fd, "highlights"))),
    features: JSON.stringify(lines(str(fd, "features"))),
    specs: JSON.stringify(parseSpecs(str(fd, "specs"))),
    faqs: JSON.stringify(parseFaqs(str(fd, "faqs"))),
    isBestSeller: bool(fd, "isBestSeller"),
    isFeatured: bool(fd, "isFeatured"),
    isDeal: bool(fd, "isDeal"),
    active: bool(fd, "active"),
  };
}

function revalidateStorefront(slug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  if (slug) revalidatePath(`/product/${slug}`);
}

// --- auth ---

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const blocked = await limitByIp("admin-login", 8, 60);
  if (blocked) return { error: blocked };
  const password = (formData.get("password") ?? "").toString();
  const ip = await clientIp();
  if (!checkPassword(password)) {
    await logEvent({
      level: "warn",
      actor: "admin",
      action: "admin.login.failed",
      message: "Failed admin login attempt",
      ip,
    });
    return { error: "Incorrect password. Please try again." };
  }
  await setSessionCookie();
  await logEvent({
    level: "info",
    actor: "admin",
    action: "admin.login",
    message: "Admin signed in",
    ip,
  });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

// --- products ---

export async function createProduct(formData: FormData): Promise<void> {
  await assertAdmin();
  const data = productDataFromForm(formData);
  const id = `p-${data.slug}-${Math.random().toString(36).slice(2, 6)}`;
  await prisma.product.create({ data: { id, ...data } });
  revalidateStorefront(data.slug);
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  const data = productDataFromForm(formData);
  await prisma.product.update({ where: { id }, data });
  revalidateStorefront(data.slug);
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  const product = await prisma.product.findUnique({ where: { id } });
  await prisma.product.delete({ where: { id } });
  revalidateStorefront(product?.slug);
  redirect("/admin/products");
}

// --- bulk product actions (selection) ---

export async function setProductsStatus(
  ids: string[],
  active: boolean,
): Promise<void> {
  await assertAdmin();
  if (ids.length === 0) return;
  await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { active },
  });
  revalidateStorefront();
  revalidatePath("/admin/inventory");
}

export async function deleteProducts(ids: string[]): Promise<void> {
  await assertAdmin();
  if (ids.length === 0) return;
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  revalidateStorefront();
  revalidatePath("/admin/inventory");
}

// --- bulk product import (CSV) ---

export interface ImportResult {
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
}

export async function importProducts(
  _prev: ImportResult | undefined,
  formData: FormData,
): Promise<ImportResult> {
  await assertAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file to import." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File too large — keep it under 5MB." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: "Could not read the file." };
  }

  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) {
    return { error: "The file has a header but no product rows." };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  if (col("name") < 0 || col("price") < 0 || col("mrp") < 0) {
    return { error: "Missing required columns: name, price, mrp." };
  }
  const cell = (row: string[], name: string) => {
    const i = col(name);
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };
  const pipes = (v: string) =>
    v.split("|").map((x) => x.trim()).filter(Boolean);
  const truthy = (v: string) => /^(true|1|yes|y)$/i.test(v.trim());

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = cell(row, "name");
    if (!name) {
      errors.push(`Row ${r + 1}: missing name`);
      continue;
    }
    const slug = cell(row, "slug") || slugify(name);
    const price = Math.round(Number(cell(row, "price")));
    const mrp = Math.round(Number(cell(row, "mrp")));
    if (!Number.isFinite(price) || !Number.isFinite(mrp) || price <= 0 || mrp <= 0) {
      errors.push(`Row ${r + 1} (${name}): price and mrp must be numbers > 0`);
      continue;
    }

    const image = cell(row, "image") || null;
    const specs = pipes(cell(row, "specs")).map((l) => {
      const i = l.indexOf(":");
      return i === -1
        ? { label: l, value: "" }
        : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
    });
    const faqs = pipes(cell(row, "faqs")).map((l) => {
      const [q, ...a] = l.split("::");
      return { q: q.trim(), a: a.join("::").trim() };
    });

    const data = {
      slug,
      name,
      brand: cell(row, "brand") || "GIZMORAC",
      sku: cell(row, "sku"),
      category: cell(row, "category") || "smart-gadgets",
      art: cell(row, "art") || "printer",
      image,
      images: JSON.stringify(image ? [image] : []),
      video: null,
      price,
      mrp,
      cost: Math.round(Number(cell(row, "cost"))) || 0,
      hsn: cell(row, "hsn"),
      gstRate: Number(cell(row, "gstRate")) || 18,
      rating: Number(cell(row, "rating")) || 4.5,
      reviewCount: Math.round(Number(cell(row, "reviewCount"))) || 0,
      stock: Math.round(Number(cell(row, "stock"))) || 0,
      lowStockThreshold: Math.round(Number(cell(row, "lowStockThreshold"))) || 10,
      shortDescription: cell(row, "shortDescription"),
      description: cell(row, "description"),
      badges: JSON.stringify(pipes(cell(row, "badges"))),
      highlights: JSON.stringify(pipes(cell(row, "highlights"))),
      features: JSON.stringify(pipes(cell(row, "features"))),
      specs: JSON.stringify(specs),
      faqs: JSON.stringify(faqs),
      isBestSeller: truthy(cell(row, "isBestSeller")),
      isFeatured: truthy(cell(row, "isFeatured")),
      isDeal: truthy(cell(row, "isDeal")),
      // Default to Active unless the CSV explicitly says otherwise.
      active: cell(row, "active") === "" ? true : truthy(cell(row, "active")),
    };

    try {
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        await prisma.product.update({ where: { slug }, data });
        updated += 1;
      } else {
        await prisma.product.create({
          data: { id: `p-${slug}-${Math.random().toString(36).slice(2, 6)}`, ...data },
        });
        created += 1;
      }
    } catch {
      errors.push(`Row ${r + 1} (${name}): could not be saved`);
    }
  }

  revalidateStorefront();
  revalidatePath("/admin/inventory");
  return { created, updated, errors: errors.slice(0, 12) };
}

/**
 * Import products from an Amazon Seller Central listings report (the tab-
 * separated .txt from Reports → Inventory → All/Active Listings Report).
 * Matches existing products by ASIN (or slug) so re-importing updates rather
 * than duplicates. Images/videos are not imported — the seller adds those here.
 */
export async function importAmazonListings(
  _prev: ImportResult | undefined,
  formData: FormData,
): Promise<ImportResult> {
  await assertAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose your Amazon listings report (.txt) to import." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "File too large — keep it under 10MB." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: "Could not read the file." };
  }

  const { records, skipped } = mapAmazonReportToProducts(text);
  if (records.length === 0) {
    return {
      error:
        "No products found. Make sure this is the Amazon 'All Listings Report' (tab-separated .txt).",
    };
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const rec of records) {
    const data = {
      name: rec.name,
      brand: "GIZMORAC",
      sku: rec.sku,
      asin: rec.asin,
      category: rec.category,
      art: rec.art,
      price: rec.price,
      mrp: rec.mrp,
      stock: rec.stock,
      lowStockThreshold: 10,
      shortDescription: rec.shortDescription,
      description: rec.description,
      isBestSeller: rec.isBestSeller,
      isFeatured: rec.isFeatured,
      isDeal: rec.isDeal,
      active: rec.active,
    };
    try {
      const existing = rec.asin
        ? await prisma.product.findFirst({ where: { asin: rec.asin } })
        : await prisma.product.findUnique({ where: { slug: rec.slug } });
      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.product.create({
          data: {
            id: `p-${rec.slug}-${Math.random().toString(36).slice(2, 6)}`,
            slug: rec.slug,
            images: "[]",
            ...data,
          },
        });
        created += 1;
      }
    } catch {
      errors.push(`${rec.name.slice(0, 50)}: could not be saved`);
    }
  }

  revalidateStorefront();
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  return { created, updated, skipped, errors: errors.slice(0, 12) };
}

// --- inventory ---

export async function updateInventory(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  const stock = Math.max(0, int(formData, "stock"));
  const lowStockThreshold = Math.max(0, int(formData, "lowStockThreshold", 10));
  const product = await prisma.product.update({
    where: { id },
    data: { stock, lowStockThreshold },
  });
  revalidateStorefront(product.slug);
  revalidatePath("/admin/inventory");
}

export interface InventoryEdit {
  id: string;
  stock: number;
  lowStockThreshold: number;
}

export interface BulkInventoryResult {
  saved: number;
  error?: string;
}

/** Save many inventory rows in one transaction — powers the "Save All" bar. */
export async function bulkUpdateInventory(
  edits: InventoryEdit[],
): Promise<BulkInventoryResult> {
  await assertAdmin();
  const clean = (Array.isArray(edits) ? edits : [])
    .filter((e) => e && typeof e.id === "string")
    .map((e) => ({
      id: e.id,
      stock: Math.max(0, Math.round(Number(e.stock) || 0)),
      lowStockThreshold: Math.max(0, Math.round(Number(e.lowStockThreshold) || 0)),
    }))
    .slice(0, 1000); // sane upper bound

  if (clean.length === 0) return { saved: 0 };

  // Snapshot current stock so we can log manual deltas to the ledger.
  const current = await prisma.product.findMany({
    where: { id: { in: clean.map((e) => e.id) } },
    select: { id: true, stock: true },
  });
  const stockById = new Map(current.map((p) => [p.id, p.stock]));

  try {
    await prisma.$transaction([
      ...clean.map((e) =>
        prisma.product.update({
          where: { id: e.id },
          data: { stock: e.stock, lowStockThreshold: e.lowStockThreshold },
        }),
      ),
      // Append a MANUAL_ADJUST ledger row for every row whose stock changed.
      ...clean.flatMap((e) => {
        const before = stockById.get(e.id);
        if (before === undefined || before === e.stock) return [];
        return [
          prisma.inventoryTransaction.create({
            data: {
              productId: e.id,
              type: "MANUAL_ADJUST",
              delta: e.stock - before,
              stockAfter: e.stock,
              reason: "Manual edit (admin)",
              idempotencyKey: `manual:${e.id}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            },
          }),
        ];
      }),
    ]);
  } catch {
    return { saved: 0, error: "Some products could not be saved. Please retry." };
  }

  revalidateStorefront();
  revalidatePath("/admin/inventory");
  return { saved: clean.length };
}

/** Save the private inventory note for a product. */
export async function saveInventoryNote(productId: string, note: string): Promise<{ ok: boolean }> {
  await assertAdmin();
  await prisma.product.update({
    where: { id: productId },
    data: { inventoryNote: String(note ?? "").slice(0, 2000) },
  });
  revalidatePath(`/admin/inventory/${productId}`);
  return { ok: true };
}

/** Save the reorder supplier for a product. */
export async function saveSupplier(productId: string, supplier: string): Promise<{ ok: boolean }> {
  await assertAdmin();
  await prisma.product.update({
    where: { id: productId },
    data: { supplier: String(supplier ?? "").slice(0, 200) },
  });
  revalidatePath(`/admin/inventory/${productId}`);
  return { ok: true };
}

/** Save the Finance operating-cost assumptions (gateway/COD fee rates). */
export async function saveFinanceFees(input: {
  paymentFeePct: number;
  codFeePct: number;
  codFeeFlat: number;
}): Promise<{ ok: boolean }> {
  await assertAdmin();
  const clamp = (n: number, max: number) => Math.min(Math.max(0, Number(n) || 0), max);
  await prisma.storeSetting.update({
    where: { id: "store" },
    data: {
      paymentFeePct: clamp(input.paymentFeePct, 100),
      codFeePct: clamp(input.codFeePct, 100),
      codFeeFlat: Math.round(clamp(input.codFeeFlat, 100000)),
    },
  });
  revalidatePath("/admin/finance");
  return { ok: true };
}

// --- orders ---

/**
 * Run the two-leg replacement for an order: a reverse pickup (customer →
 * warehouse) to collect the faulty unit, and a fresh forward shipment
 * (warehouse → customer) for the new one. Each leg is independent and
 * idempotent — re-running picks up only the legs that haven't completed (e.g.
 * after funding the Shiprocket wallet), so a click never double-creates.
 * Returns ok:false (with what did/didn't happen) if any leg is incomplete.
 */
async function startReplacement(
  orderId: string,
): Promise<{ ok: boolean; note: string; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, note: "", error: "Order not found." };

  const done: string[] = [];
  const problems: string[] = [];

  // --- Leg 1: reverse pickup (customer → warehouse) ---
  let returnShipmentId = order.returnShipmentId;
  if (!order.returnOrderId) {
    const ret = await createReturnOrder(order);
    if (ret.ok) {
      returnShipmentId = ret.shipmentId ?? "";
      await prisma.order.update({
        where: { id: orderId },
        data: {
          returnOrderId: ret.shiprocketOrderId ?? "",
          returnShipmentId,
          returnStatus: ret.status ?? "Return created",
        },
      });
    } else {
      problems.push(`Reverse pickup couldn't be created — ${ret.error}`);
    }
  }
  if (order.returnAwb) {
    done.push(`Reverse pickup already booked (AWB ${order.returnAwb}).`);
  } else if (returnShipmentId) {
    const rs = await shipReturn(returnShipmentId);
    if (rs.ok) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          returnAwb: rs.awb ?? "",
          returnCourier: rs.courier ?? "",
          returnStatus: "Pickup scheduled",
        },
      });
      done.push(`Reverse pickup booked (AWB ${rs.awb}${rs.courier ? `, ${rs.courier}` : ""}).`);
    } else {
      problems.push(`Reverse pickup courier not assigned — ${rs.error}`);
    }
  }

  // --- Leg 2: forward replacement (warehouse → customer) ---
  let replacementShipmentId = order.replacementShipmentId;
  if (!order.replacementOrderId) {
    const rep = await createShiprocketOrder(order, { orderIdSuffix: "-REP" });
    if (rep.ok) {
      replacementShipmentId = rep.shipmentId ?? "";
      await prisma.order.update({
        where: { id: orderId },
        data: {
          replacementOrderId: rep.shiprocketOrderId ?? "",
          replacementShipmentId,
          replacementStatus: rep.status ?? "Created",
        },
      });
    } else {
      problems.push(`Replacement shipment couldn't be created — ${rep.error}`);
    }
  }
  if (order.replacementAwb) {
    done.push(`Replacement already shipped (AWB ${order.replacementAwb}).`);
  } else if (replacementShipmentId) {
    const s = await shipShipment(replacementShipmentId);
    if (s.ok) {
      const t = await getTracking(replacementShipmentId);
      await prisma.order.update({
        where: { id: orderId },
        data: {
          replacementAwb: s.awb ?? "",
          replacementCourier: s.courier ?? "",
          replacementLabelUrl: s.labelUrl ?? "",
          replacementTrackingUrl: t?.trackingUrl ?? "",
          replacementStatus: t?.status || "Ready to ship",
        },
      });
      done.push(`Replacement shipped (AWB ${s.awb}${s.courier ? `, ${s.courier}` : ""}).`);
    } else {
      problems.push(`Replacement courier not assigned — ${s.error}`);
    }
  }

  if (problems.length > 0) {
    return {
      ok: false,
      note: done.join(" "),
      error: `${problems.join(" ")}${done.length ? ` (Done: ${done.join(" ")})` : ""}`,
    };
  }
  return { ok: true, note: done.join(" ") || "Replacement started." };
}

export interface OrderStatusResult {
  ok: boolean;
  note?: string;
  error?: string;
}

export async function updateOrderStatus(formData: FormData): Promise<OrderStatusResult> {
  await assertAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");

  // Refunds move real money, so fire the refund BEFORE flipping the label: a
  // gateway failure must not leave an order marked "Refunded" with nothing sent.
  let refundNote = "";
  if (status === "Refunded") {
    const r = await refundOrderPayment(id);
    if (!r.ok) {
      return {
        ok: false,
        error: r.error
          ? `Refund failed — ${r.error} The order was left unchanged.`
          : "Refund couldn't be started. The order was left unchanged.",
      };
    }
    refundNote = r.moved
      ? `Refund of ₹${r.amount.toLocaleString("en-IN")} sent to the customer's original payment method.`
      : "Marked refunded — this was a cash order, so refund the customer manually.";
  }

  // A replacement books a reverse pickup + a fresh forward shipment before the
  // label flips, so the order is only marked "Replacement" once both are set up.
  let replacementNote = "";
  if (status === "Replacement") {
    const r = await startReplacement(id);
    if (!r.ok) {
      return {
        ok: false,
        error: `${r.error} The order was left unchanged — fix the issue and try again.`,
      };
    }
    replacementNote = r.note;
  }

  // Cancelling reverses everything: refund the customer, cancel the Shiprocket
  // shipment (freight back to wallet), and mark it Cancelled. Refund runs first,
  // so a gateway failure leaves the order unchanged.
  let cancelNote = "";
  if (status === "Cancelled") {
    const c = await cancelOrderEverywhere(id);
    if (!c.ok) {
      return { ok: false, error: `${c.error} The order was left unchanged.` };
    }
    cancelNote = c.note;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status, ...(status === "Delivered" ? { deliveredAt: new Date() } : {}) },
  });

  await logEvent({
    actor: "admin",
    action: "admin.order.status",
    message: `Order ${updated.orderNumber} → ${status}`,
    meta: { orderNumber: updated.orderNumber, status, email: updated.email },
  });

  if (status === "Refunded") {
    await logEvent({
      actor: "admin",
      action: "admin.order.refund",
      message: `${refundNote} (${updated.orderNumber})`,
      meta: { orderNumber: updated.orderNumber },
    });
  }

  if (status === "Replacement") {
    await logEvent({
      actor: "admin",
      action: "admin.order.replacement",
      message: `Replacement for ${updated.orderNumber}: ${replacementNote}`,
      meta: { orderNumber: updated.orderNumber },
    });
  }

  // Reward the customer with a repeat-order coupon the moment it's delivered.
  if (status === "Delivered") {
    await issueRepeatCoupon({
      id: updated.id,
      customerId: updated.customerId,
      email: updated.email,
    });
  }

  if (status === "Cancelled") {
    await logEvent({
      actor: "admin",
      action: "admin.shipping.cancel",
      message: `${cancelNote} (${updated.orderNumber})`,
      meta: { orderNumber: updated.orderNumber },
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath(`/order/${updated.orderNumber}`);
  revalidatePath("/account");

  return { ok: true, note: replacementNote || refundNote || cancelNote || undefined };
}

/**
 * Combine the shipping labels of many orders into a single PDF (bulk print).
 * Only orders that actually have a Shiprocket shipment are included.
 */
export async function bulkDownloadLabels(
  orderIds: string[],
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await assertAdmin();
  if (orderIds.length === 0) return { ok: false, error: "Select at least one order." };
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, shipmentId: { not: "" } },
    select: { shipmentId: true },
  });
  const ids = orders.map((o) => o.shipmentId).filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, error: "None of the selected orders have a shipping label yet." };
  }
  return generateLabels(ids);
}

/** Ship many orders at once (assign AWB + label + pickup per order). */
export async function bulkMarkShipped(
  orderIds: string[],
): Promise<{ ok: boolean; shipped: number; failed: number; error?: string }> {
  await assertAdmin();
  if (orderIds.length === 0) return { ok: false, shipped: 0, failed: 0, error: "Select at least one order." };
  let shipped = 0;
  let failed = 0;
  for (const id of orderIds) {
    try {
      const r = await shipNow(id);
      if (r.ok) shipped++;
      else failed++;
    } catch {
      failed++;
    }
  }
  revalidatePath("/admin/orders");
  return { ok: true, shipped, failed };
}

/** Save internal admin notes on an order (never shown to the customer). */
export async function saveAdminNotes(orderId: string, notes: string): Promise<{ ok: boolean }> {
  await assertAdmin();
  await prisma.order.update({
    where: { id: orderId },
    data: { adminNotes: notes.slice(0, 4000) },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/**
 * Record (or override) the delivery cost we paid the courier for this order, in
 * rupees. Lets the owner capture spend for shipments booked outside the
 * Shiprocket auto-flow, or correct an auto-captured freight charge. Pass 0 to
 * clear it back to "Not recorded".
 */
export async function setShipmentCost(
  orderId: string,
  rupees: number,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  if (!Number.isFinite(rupees) || rupees < 0 || rupees > 1_000_000) {
    return { ok: false, error: "Enter a valid amount between ₹0 and ₹10,00,000." };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { shipmentCostPaise: Math.round(rupees * 100) },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export interface DeliveryRateResult {
  ok: boolean;
  ratePaise?: number;
  courier?: string;
  /** true = Shiprocket rate estimate; false = real charge captured at dispatch. */
  estimated?: boolean;
  error?: string;
}

/**
 * Auto-detect the delivery cost from Shiprocket for an order's destination
 * pincode (no manual entry needed) and store it. Skips overwriting once the
 * order has actually shipped — by then shipmentCostPaise holds the real freight.
 */
export async function autoEstimateDeliveryCost(orderId: string): Promise<DeliveryRateResult> {
  await assertAdmin();
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };

  // Already dispatched → the recorded figure is the actual charge; keep it.
  if (order.awb) {
    return {
      ok: true,
      ratePaise: order.shipmentCostPaise,
      courier: order.courier,
      estimated: false,
    };
  }

  const est = await estimateOrderFreight(order);
  if (!est) {
    return { ok: false, error: "Shiprocket couldn't rate this pincode right now." };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { shipmentCostPaise: est.ratePaise },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, ratePaise: est.ratePaise, courier: est.courier, estimated: true };
}

// --- customers (soft delete / restore) ---

export interface CustomerStatusResult {
  ok: boolean;
  deactivated: boolean;
}

/** Admin deactivates a customer account (soft delete — orders are kept). */
export async function deactivateCustomer(id: string): Promise<CustomerStatusResult> {
  await assertAdmin();
  const c = await prisma.customer.update({
    where: { id },
    data: { deactivatedAt: new Date() },
  });
  await logEvent({
    actor: "admin",
    action: "admin.customer.deactivate",
    message: `Customer ${c.email} deactivated`,
    meta: { customerId: id, email: c.email },
  });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return { ok: true, deactivated: true };
}

/** Admin restores a previously-deactivated customer account. */
export async function restoreCustomer(id: string): Promise<CustomerStatusResult> {
  await assertAdmin();
  const c = await prisma.customer.update({
    where: { id },
    data: { deactivatedAt: null },
  });
  await logEvent({
    actor: "admin",
    action: "admin.customer.restore",
    message: `Customer ${c.email} restored`,
    meta: { customerId: id, email: c.email },
  });
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return { ok: true, deactivated: false };
}

// --- coupons / promotions ---

function couponDataFromForm(fd: FormData) {
  return {
    code: str(fd, "code").toUpperCase(),
    type: str(fd, "type") || "percent",
    value: Math.max(0, int(fd, "value")),
    minOrder: Math.max(0, int(fd, "minOrder")),
    maxDiscount: Math.max(0, int(fd, "maxDiscount")),
    active: bool(fd, "active"),
    startsAt: dateOrNull(fd, "startsAt"),
    expiresAt: dateOrNull(fd, "expiresAt"),
    usageLimit: Math.max(0, int(fd, "usageLimit")),
    description: str(fd, "description"),
  };
}

export async function createCoupon(formData: FormData): Promise<void> {
  await assertAdmin();
  const data = couponDataFromForm(formData);
  await prisma.coupon.create({ data });
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function updateCoupon(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  const data = couponDataFromForm(formData);
  await prisma.coupon.update({ where: { id }, data });
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function deleteCoupon(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

// --- categories ---

function categoryDataFromForm(fd: FormData) {
  const name = str(fd, "name");
  return {
    slug: str(fd, "slug") || slugify(name),
    name,
    tagline: str(fd, "tagline"),
    art: str(fd, "art") || "printer",
    image: str(fd, "image") || null,
    sortOrder: int(fd, "sortOrder", 0),
    hidden: bool(fd, "hidden"),
    featured: bool(fd, "featured"),
  };
}

function revalidateCategories() {
  // Categories drive the home grid, shop, product forms and the footer (layout).
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function createCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  await prisma.category.create({ data: categoryDataFromForm(formData) });
  revalidateCategories();
  redirect("/admin/categories");
}

export async function updateCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  await prisma.category.update({
    where: { id },
    data: categoryDataFromForm(formData),
  });
  revalidateCategories();
  redirect("/admin/categories");
}

/** Persist a new category order (drag-and-drop) by rewriting sortOrder. */
export async function reorderCategories(orderedIds: string[]): Promise<{ ok: boolean }> {
  await assertAdmin();
  const ids = (Array.isArray(orderedIds) ? orderedIds : []).filter((s) => typeof s === "string");
  if (ids.length === 0) return { ok: true };
  await prisma.$transaction(
    ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })),
  );
  revalidateCategories();
  return { ok: true };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  await prisma.category.delete({ where: { id } });
  revalidateCategories();
  redirect("/admin/categories");
}

// --- store settings ---

export interface SettingsState {
  ok?: boolean;
  error?: string;
}

export async function updateSettings(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  await assertAdmin();

  const data = {
    storeName: str(formData, "storeName") || "GIZMORAC",
    supportEmail: str(formData, "supportEmail"),
    supportPhone: str(formData, "supportPhone"),
    whatsappNumber: str(formData, "whatsappNumber").replace(/\D/g, ""),
    legalName: str(formData, "legalName") || "GIZMORAC",
    companyAddress: str(formData, "companyAddress"),
    companyState: str(formData, "companyState"),
    companyStateCode: str(formData, "companyStateCode").replace(/\D/g, "").slice(0, 2),
    companyPan: str(formData, "companyPan").toUpperCase(),
    companyGstin: str(formData, "companyGstin").toUpperCase(),
    announcementText: str(formData, "announcementText"),
    announcementEnabled: bool(formData, "announcementEnabled"),
    announcementScroll: bool(formData, "announcementScroll"),
    freeShippingThreshold: Math.max(0, int(formData, "freeShippingThreshold", 999)),
    shippingFee: Math.max(0, int(formData, "shippingFee", 79)),
    codEnabled: bool(formData, "codEnabled"),
    instagramUrl: str(formData, "instagramUrl"),
    facebookUrl: str(formData, "facebookUrl"),
    youtubeUrl: str(formData, "youtubeUrl"),
    twitterUrl: str(formData, "twitterUrl"),
    landingPopupEnabled: bool(formData, "landingPopupEnabled"),
    landingPopupTitle: str(formData, "landingPopupTitle"),
    landingPopupMessage: str(formData, "landingPopupMessage"),
    landingPopupCode: str(formData, "landingPopupCode").toUpperCase(),
    browseOfferEnabled: bool(formData, "browseOfferEnabled"),
    browseOfferAmount: Math.max(0, int(formData, "browseOfferAmount", 100)),
    browseOfferDelay: Math.min(3600, Math.max(1, int(formData, "browseOfferDelay", 25))),
    cartOfferEnabled: bool(formData, "cartOfferEnabled"),
    cartOfferAmount: Math.max(0, int(formData, "cartOfferAmount", 100)),
    cartOfferDelay: Math.min(3600, Math.max(1, int(formData, "cartOfferDelay", 60))),
  };

  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: data,
    create: { id: "store", ...data },
  });

  await logEvent({
    actor: "admin",
    action: "admin.settings.update",
    message: "Store settings updated",
  });

  // Settings drive the header, footer, WhatsApp, cart and checkout.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true };
}

// Boolean settings that the admin can flip individually and have apply
// instantly (no separate "Save settings" step). Keep this allow-list tight so a
// forged call can't write arbitrary columns.
const BOOLEAN_SETTINGS = [
  "announcementEnabled",
  "announcementScroll",
  "codEnabled",
] as const;
export type BooleanSetting = (typeof BOOLEAN_SETTINGS)[number];

/**
 * Persist a single boolean setting the moment its toggle is flipped, so the
 * switch behaves like a real switch (the storefront reflects it on next load)
 * instead of silently needing a "Save settings" click.
 */
export async function setBooleanSetting(
  field: BooleanSetting,
  value: boolean,
): Promise<SettingsState> {
  await assertAdmin();
  if (!BOOLEAN_SETTINGS.includes(field)) return { error: "Unknown setting." };

  const patch: Partial<Record<BooleanSetting, boolean>> = { [field]: value };
  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: patch,
    create: { id: "store", ...patch },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true };
}

// --- payment gateway (PhonePe) ---

export interface PaymentGatewayState {
  ok: boolean;
  error?: string;
  connected?: boolean;
  env?: PhonePeEnv;
}

/**
 * Save the PhonePe keys, verify them live against PhonePe, and (only on
 * success) switch the gateway on. The entered keys replace whatever was stored;
 * a blank secret keeps the existing one so the admin needn't retype it.
 */
export async function connectPaymentGateway(input: {
  clientId: string;
  clientVersion: string;
  clientSecret: string;
  env: PhonePeEnv;
}): Promise<PaymentGatewayState> {
  await assertAdmin();

  const env: PhonePeEnv = input.env === "production" ? "production" : "sandbox";

  // The key fields are blank in the UI unless the admin is changing them, so a
  // blank value means "keep what's stored" (the real keys never leave the server).
  const existing = await prisma.storeSetting.findUnique({ where: { id: "store" } });
  const clientId = (input.clientId ?? "").trim() || existing?.phonepeClientId || "";
  const clientVersion =
    (input.clientVersion ?? "").trim() || existing?.phonepeClientVersion || "1";
  const clientSecret = (input.clientSecret ?? "").trim() || existing?.phonepeClientSecret || "";

  if (!clientId || !clientSecret) {
    return { ok: false, error: "Enter the Client ID and Client Secret." };
  }

  // Verify before we save+switch on, so "Connected" really means reachable.
  const verified = await verifyPhonePeKeys({ clientId, clientVersion, clientSecret, env });
  if (!verified.ok) {
    return { ok: false, error: verified.error ?? "Could not verify these keys." };
  }

  const data = {
    phonepeClientId: clientId,
    phonepeClientVersion: clientVersion,
    phonepeClientSecret: clientSecret,
    phonepeEnv: env,
    phonepeConnected: true,
  };
  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: data,
    create: { id: "store", ...data },
  });

  await logEvent({
    actor: "admin",
    action: "admin.payment.connect",
    message: `Payment gateway connected (${env})`,
    meta: { env },
  });

  revalidatePath("/", "layout");
  revalidatePath("/checkout");
  revalidatePath("/admin/settings");
  return { ok: true, connected: true, env };
}

/** Turn the gateway off — checkout falls back to Cash on Delivery only. */
export async function disconnectPaymentGateway(): Promise<PaymentGatewayState> {
  await assertAdmin();
  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: { phonepeConnected: false },
    create: { id: "store", phonepeConnected: false },
  });

  await logEvent({
    level: "warn",
    actor: "admin",
    action: "admin.payment.disconnect",
    message: "Payment gateway disconnected — online payments off",
  });

  revalidatePath("/", "layout");
  revalidatePath("/checkout");
  revalidatePath("/admin/settings");
  return { ok: true, connected: false };
}

// --- shipping (Shiprocket) ---

export interface ShiprocketState {
  ok: boolean;
  error?: string;
  connected?: boolean;
}

/** Verify the Shiprocket API user, save the config, and switch it on. */
export async function connectShiprocket(input: {
  email: string;
  password: string;
  pickup: string;
}): Promise<ShiprocketState> {
  await assertAdmin();
  const email = (input.email ?? "").trim();
  const existing = await prisma.storeSetting.findUnique({ where: { id: "store" } });
  // Blank password = keep the stored one (it's masked in the UI).
  const password = (input.password ?? "").trim() || existing?.shiprocketPassword || "";
  if (!email || !password) {
    return { ok: false, error: "Enter the Shiprocket API email and password." };
  }

  const verified = await verifyShiprocket({ email, password });
  if (!verified.ok) {
    return { ok: false, error: verified.error ?? "Could not verify these credentials." };
  }

  const data = {
    shiprocketEmail: email,
    shiprocketPassword: password,
    shiprocketPickup: (input.pickup ?? "").trim(),
    shiprocketConnected: true,
    // Force a fresh token on next call.
    shiprocketToken: "",
    shiprocketTokenExp: null,
  };
  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: data,
    create: { id: "store", ...data },
  });

  // Cache the pickup location's pincode for checkout serviceability/ETA.
  const pin = await fetchPickupPincode(data.shiprocketPickup);
  if (pin) {
    await prisma.storeSetting.update({
      where: { id: "store" },
      data: { shiprocketPickupPin: pin },
    });
  }

  await logEvent({
    actor: "admin",
    action: "admin.shipping.connect",
    message: "Shiprocket connected",
  });
  revalidatePath("/admin/settings");
  return { ok: true, connected: true };
}

/** Turn Shiprocket off (orders can no longer be pushed to it). */
export async function disconnectShiprocket(): Promise<ShiprocketState> {
  await assertAdmin();
  await prisma.storeSetting.upsert({
    where: { id: "store" },
    update: { shiprocketConnected: false },
    create: { id: "store", shiprocketConnected: false },
  });
  await logEvent({
    level: "warn",
    actor: "admin",
    action: "admin.shipping.disconnect",
    message: "Shiprocket disconnected",
  });
  revalidatePath("/admin/settings");
  return { ok: true, connected: false };
}

export interface ShipResult {
  ok: boolean;
  error?: string;
}

/** Push an order into Shiprocket so it can be assigned a courier & shipped. */
export async function pushToShiprocket(orderId: string): Promise<ShipResult> {
  await assertAdmin();
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.shiprocketOrderId) {
    return { ok: false, error: "This order is already in Shiprocket." };
  }

  const res = await createShiprocketOrder(order);
  if (!res.ok) return { ok: false, error: res.error };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      shiprocketOrderId: res.shiprocketOrderId ?? "",
      shipmentId: res.shipmentId ?? "",
      shipmentStatus: res.status ?? "Created",
    },
  });
  await logEvent({
    actor: "admin",
    action: "admin.shipping.push",
    message: `Order ${order.orderNumber} pushed to Shiprocket`,
    meta: { orderNumber: order.orderNumber, shipmentId: res.shipmentId ?? "" },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/${order.orderNumber}`);
  return { ok: true };
}

/** Refresh an order's live tracking from Shiprocket. */
export async function syncShipment(orderId: string): Promise<ShipResult> {
  await assertAdmin();
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.shipmentId) return { ok: false, error: "Push the order to Shiprocket first." };

  const t = await getTracking(order.shipmentId);
  if (!t) return { ok: false, error: "Couldn't fetch tracking right now." };

  await recordShipmentUpdate({
    orderNumber: order.orderNumber,
    status: t.status,
    awb: t.awb,
    courier: t.courier,
    trackingUrl: t.trackingUrl,
  });
  return { ok: true };
}

/**
 * One-click ship: create the Shiprocket order if needed, assign a courier
 * (AWB), schedule the pickup, and generate the label — then mark the order
 * Shipped and store the AWB/courier/label/tracking.
 */
export async function shipNow(orderId: string): Promise<ShipResult> {
  await assertAdmin();
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };

  let shipmentId = order.shipmentId;
  let shiprocketOrderId = order.shiprocketOrderId;

  // Create the Shiprocket order first if it isn't there yet.
  if (!shiprocketOrderId) {
    const created = await createShiprocketOrder(order);
    if (!created.ok) return { ok: false, error: created.error };
    shiprocketOrderId = created.shiprocketOrderId ?? "";
    shipmentId = created.shipmentId ?? "";
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shiprocketOrderId,
        shipmentId,
        shipmentStatus: created.status ?? "Created",
      },
    });
  }
  if (!shipmentId) return { ok: false, error: "No shipment id from Shiprocket." };

  // Assign courier + AWB, schedule pickup, generate label.
  const s = await shipShipment(shipmentId);
  if (!s.ok) return { ok: false, error: s.error };

  // Pull the public tracking URL now that an AWB exists.
  const t = await getTracking(shipmentId);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "Shipped",
      // Advance the v2 status too, so the order reaches SHIPPED and the
      // customer/admin Cancel action correctly disables once it's dispatched.
      statusV2: "SHIPPED",
      awb: s.awb || t?.awb || order.awb,
      courier: s.courier || t?.courier || order.courier,
      labelUrl: s.labelUrl || order.labelUrl,
      trackingUrl: t?.trackingUrl || order.trackingUrl,
      shipmentStatus: t?.status || "Ready to ship",
      // Only overwrite when Shiprocket actually returned a freight charge.
      ...(s.freightCharge ? { shipmentCostPaise: Math.round(s.freightCharge * 100) } : {}),
    },
  });
  await prisma.orderStatusHistory.create({
    data: {
      entityType: "ORDER",
      entityId: orderId,
      orderId,
      previousState: order.status,
      newState: "SHIPPED",
      actorRole: "ADMIN",
      reason: "shipped via Shiprocket",
    },
  });
  await logEvent({
    actor: "admin",
    action: "admin.shipping.shipped",
    message: `Order ${order.orderNumber} shipped via ${s.courier || "Shiprocket"} (AWB ${s.awb})`,
    meta: { orderNumber: order.orderNumber, awb: s.awb ?? "" },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/order/${order.orderNumber}`);
  revalidatePath("/account");
  return { ok: true };
}

// --- support tickets (damage / defect claims) ---

async function revalidateTicket(ticketId: string): Promise<void> {
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath("/admin");
  const t = await getTicketById(ticketId);
  if (t) revalidatePath(`/order/${t.orderNumber}`);
}

/**
 * Admin replies on a ticket. With "proofRequest" checked, it's logged as a
 * request for photo/video proof and the ticket moves to "Awaiting proof".
 */
export async function adminReplyTicket(formData: FormData): Promise<void> {
  await assertAdmin();
  const ticketId = str(formData, "ticketId");
  if (!ticketId) return;
  const proofRequest = bool(formData, "proofRequest");
  const attachments = jsonArray(formData, "attachments").slice(0, 6);
  let body = str(formData, "body").slice(0, 4000);
  if (!body && proofRequest) {
    body =
      "Please share clear photo or video proof of the issue so we can process your claim.";
  }
  if (!body && attachments.length === 0) return;

  await addTicketMessage({
    ticketId,
    author: "admin",
    body,
    attachments,
    proofRequest,
  });
  if (proofRequest) await setTicketStatus(ticketId, "Awaiting proof");
  await revalidateTicket(ticketId);
}

/**
 * Admin decides a ticket: grant a Refund / Replacement / Warranty claim, or
 * reject it. Records a closing message and sets the final status.
 */
export async function resolveTicket(formData: FormData): Promise<void> {
  await assertAdmin();
  const ticketId = str(formData, "ticketId");
  if (!ticketId) return;
  const decision = str(formData, "decision");
  const note = str(formData, "note").slice(0, 2000);

  let resolution: TicketResolution = "";
  let status: TicketStatus;
  let body: string;

  if (decision === "Reject") {
    status = "Rejected";
    body = note || "After reviewing the details, we're unable to approve this claim.";
  } else if ((TICKET_RESOLUTIONS as string[]).includes(decision)) {
    resolution = decision as TicketResolution;
    status = "Resolved";
    const labels: Record<string, string> = {
      Refund: "A refund has been approved and will be processed shortly.",
      Replacement: "A replacement has been approved and will be arranged shortly.",
      Warranty: "Your warranty claim has been approved.",
    };
    body = `${labels[decision]}${note ? ` ${note}` : ""}`;
  } else {
    return;
  }

  await addTicketMessage({ ticketId, author: "admin", body, attachments: [] });
  await setTicketResolution(ticketId, resolution, status);

  // Online refund: if the claim is approved as a Refund and the order was paid
  // online via PhonePe, fire the refund and start tracking it on the order.
  // Uses the same refund path as the order-status updater so both behave alike.
  if (resolution === "Refund") {
    const ticket = await getTicketById(ticketId);
    if (ticket) {
      const r = await refundOrderPayment(ticket.orderId);
      if (r.ok && r.moved) {
        await prisma.order.update({
          where: { id: ticket.orderId },
          data: { status: "Refunded" },
        });
        await addTicketMessage({
          ticketId,
          author: "admin",
          body: `Refund of ₹${r.amount.toLocaleString("en-IN")} initiated to your original payment method. It usually completes in 3–5 business days.`,
          attachments: [],
        });
        const order = await prisma.order.findUnique({ where: { id: ticket.orderId } });
        if (order) revalidatePath(`/order/${order.orderNumber}`);
        revalidatePath("/account");
        revalidatePath("/admin/orders");
      } else if (!r.ok) {
        await addTicketMessage({
          ticketId,
          author: "admin",
          body: `(Internal) Auto-refund could not be started: ${r.error ?? "unknown error"}. Please process it manually.`,
          attachments: [],
        });
      }
    }
  }

  await revalidateTicket(ticketId);
}

