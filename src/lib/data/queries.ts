import type {
  Prisma,
  Product as ProductRow,
  Category as CategoryRow,
} from "@prisma/client";
import type {
  Category,
  CategorySlug,
  DeviceArt,
  PagedResult,
  Product,
  Review,
  ShopQuery,
  SortOption,
} from "@/lib/types";
import { discountPercent } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reviews } from "./reviews";
import { siteFaqs } from "./faqs";

// Products + orders live in the database (Prisma/SQLite). Categories, reviews
// and FAQs remain static config. Every accessor returns the same domain types
// the UI already uses, so swapping the storage layer required no UI changes.

const PAGE_SIZE = 9;

/** Map a Prisma row to the UI domain `Product` type (parses JSON columns). */
function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    sku: r.sku,
    category: r.category as CategorySlug,
    art: r.art as DeviceArt,
    image: r.image,
    images: safeParse<string[]>(r.images),
    video: r.video,
    price: r.price,
    mrp: r.mrp,
    cost: r.cost,
    hsn: r.hsn,
    gstRate: r.gstRate,
    weightKg: r.weightKg,
    lengthCm: r.lengthCm,
    breadthCm: r.breadthCm,
    heightCm: r.heightCm,
    rating: r.rating,
    reviewCount: r.reviewCount,
    stock: r.stock,
    lowStockThreshold: r.lowStockThreshold,
    warrantyMonths: r.warrantyMonths,
    badges: safeParse(r.badges),
    shortDescription: r.shortDescription,
    description: r.description,
    highlights: safeParse(r.highlights),
    features: safeParse(r.features),
    specs: safeParse(r.specs),
    faqs: safeParse(r.faqs),
    isBestSeller: r.isBestSeller,
    isFeatured: r.isFeatured,
    isDeal: r.isDeal,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

function safeParse<T = unknown>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return [] as unknown as T;
  }
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toProduct);
}

/**
 * Closing stock = current inventory on hand across active products: total units
 * and their value at selling price. (Point-in-time — there's no stock history,
 * so this reflects stock as of now.)
 */
export async function getClosingStock(): Promise<{
  units: number;
  value: number;
  skus: number;
}> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { stock: true, price: true },
  });
  let units = 0;
  let value = 0;
  for (const r of rows) {
    units += r.stock;
    value += r.stock * r.price;
  }
  return { units, value, skus: rows.length };
}

/** Min/max selling price across active products — powers the shop price slider. */
export async function getPriceBounds(): Promise<{ min: number; max: number }> {
  const agg = await prisma.product.aggregate({
    where: { active: true },
    _min: { price: true },
    _max: { price: true },
  });
  return { min: agg._min.price ?? 0, max: agg._max.price ?? 0 };
}

/** Storefront PDP lookup — drafts (inactive) are treated as not found. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { slug } });
  return row && row.active ? toProduct(row) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? toProduct(row) : null;
}

/** Active product slugs only — used for SSG params and the sitemap. */
export async function getProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

function toCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    art: r.art as DeviceArt,
    image: r.image,
    sortOrder: r.sortOrder,
  };
}

export async function getCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const row = await prisma.category.findUnique({ where: { slug } });
  return row ? toCategory(row) : null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const row = await prisma.category.findUnique({ where: { id } });
  return row ? toCategory(row) : null;
}

/** Counts only active products so storefront category filters match what shows. */
export async function getCategoryCounts(): Promise<Record<CategorySlug, number>> {
  const counts: Record<string, number> = {};
  const grouped = await prisma.product.groupBy({
    by: ["category"],
    where: { active: true },
    _count: { _all: true },
  });
  for (const g of grouped) counts[g.category] = g._count._all;
  return counts;
}

export async function getBestSellers(limit = 8): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { isBestSeller: true, active: true },
    orderBy: { reviewCount: "desc" },
    take: limit,
  });
  return rows.map(toProduct);
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { isFeatured: true, active: true },
    take: limit,
  });
  return rows.map(toProduct);
}

export async function getDealOfTheDay(): Promise<Product | null> {
  const deals = (
    await prisma.product.findMany({ where: { isDeal: true, active: true } })
  ).map(toProduct);
  if (deals.length === 0) return null;
  return deals.sort((a, b) => discountPercent(b) - discountPercent(a))[0];
}

export async function getRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category: product.category, id: { not: product.id }, active: true },
    take: limit,
  });
  return rows.map(toProduct);
}

export async function getReviews(limit = 6): Promise<Review[]> {
  return reviews.slice(0, limit);
}

export async function getSiteFaqs() {
  return siteFaqs;
}

function sortProducts(list: Product[], sort: SortOption): Product[] {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating);
    case "discount":
      return copy.sort((a, b) => discountPercent(b) - discountPercent(a));
    case "newest":
      return copy.sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      );
    case "popular":
    default:
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
  }
}

export async function queryProducts(
  query: ShopQuery,
): Promise<PagedResult<Product>> {
  const where: Prisma.ProductWhereInput = { active: true };
  if (query.category) where.category = query.category;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { shortDescription: { contains: query.q } },
      { sku: { contains: query.q } },
    ];
  }
  if (typeof query.minPrice === "number" || typeof query.maxPrice === "number") {
    where.price = {};
    if (typeof query.minPrice === "number") where.price.gte = query.minPrice;
    if (typeof query.maxPrice === "number") where.price.lte = query.maxPrice;
  }
  if (typeof query.minRating === "number") where.rating = { gte: query.minRating };
  if (query.availability === "in") where.stock = { gt: 0 };
  else if (query.availability === "out") where.stock = { lte: 0 };

  const rows = await prisma.product.findMany({ where });
  const sorted = sortProducts(rows.map(toProduct), query.sort ?? "popular");

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const items = sorted.slice(start, start + PAGE_SIZE);

  return { items, total, page, pageSize: PAGE_SIZE, pageCount };
}
