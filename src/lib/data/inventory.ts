import type { InventoryTxnType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** One row of the append-only stock ledger, ready for display. */
export interface StockMovement {
  id: string;
  type: InventoryTxnType;
  delta: number; // +restock / −deduct
  stockAfter: number;
  reason: string;
  orderId: string | null;
  createdAt: string;
}

/** Per-product inventory snapshot for the detail page. */
export interface ProductInventory {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  stock: number;
  lowStockThreshold: number;
  cost: number;
  supplier: string;
  inventoryNote: string;
  updatedAt: string;
}

export async function getProductInventory(id: string): Promise<ProductInventory | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sku: true,
      image: true,
      stock: true,
      lowStockThreshold: true,
      cost: true,
      supplier: true,
      inventoryNote: true,
      updatedAt: true,
    },
  });
  if (!p) return null;
  return { ...p, updatedAt: p.updatedAt.toISOString() };
}

/** Most recent stock movements for a product (newest first). */
export async function getStockMovements(productId: string, limit = 50): Promise<StockMovement[]> {
  const rows = await prisma.inventoryTransaction.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      delta: true,
      stockAfter: true,
      reason: true,
      orderId: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Low-stock items for the dashboard widget (most urgent first). */
export interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
}

export async function getLowStockItems(limit = 5): Promise<LowStockItem[]> {
  const rows = await prisma.product.findMany({
    select: { id: true, name: true, stock: true, lowStockThreshold: true },
  });
  return rows
    .filter((p) => p.stock <= p.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit);
}

/** Recent stock movements across all products (newest first). */
export interface RecentMovement {
  id: string;
  type: InventoryTxnType;
  delta: number;
  productName: string;
  createdAt: string;
}

export async function getRecentStockMovements(limit = 6): Promise<RecentMovement[]> {
  const rows = await prisma.inventoryTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      delta: true,
      createdAt: true,
      product: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    delta: r.delta,
    productName: r.product.name,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface VelocityStats {
  /** Units sold per day, averaged over the window. */
  perDay: number;
  /** Total units sold in the window. */
  unitsSold: number;
  windowDays: number;
  /** Days of stock left at the current pace (null = no recent sales). */
  daysRemaining: number | null;
  /** Reorder when stock has run low or will within the lead-time buffer. */
  reorder: boolean;
}

const REORDER_BUFFER_DAYS = 7;

/**
 * Sales velocity from the authoritative ledger: sum of units deducted by SALE
 * transactions over the window. Days-remaining and a reorder flag follow.
 */
export async function getVelocity(
  productId: string,
  stock: number,
  lowStockThreshold: number,
  windowDays = 30,
): Promise<VelocityStats> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const agg = await prisma.inventoryTransaction.aggregate({
    _sum: { delta: true },
    where: { productId, type: "SALE", createdAt: { gte: since } },
  });
  const unitsSold = Math.abs(agg._sum.delta ?? 0);
  const perDay = unitsSold / windowDays;
  const daysRemaining = perDay > 0 ? Math.round(stock / perDay) : null;
  const reorder =
    stock <= lowStockThreshold || (daysRemaining !== null && daysRemaining <= REORDER_BUFFER_DAYS);
  return { perDay, unitsSold, windowDays, daysRemaining, reorder };
}
