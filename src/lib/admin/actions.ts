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
    rating: num(fd, "rating", 4.5),
    reviewCount: int(fd, "reviewCount"),
    stock: int(fd, "stock"),
    lowStockThreshold: int(fd, "lowStockThreshold", 10),
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
  const password = (formData.get("password") ?? "").toString();
  if (!checkPassword(password)) {
    return { error: "Incorrect password. Please try again." };
  }
  await setSessionCookie();
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

// --- orders ---

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
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
