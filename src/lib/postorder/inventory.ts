// Authoritative inventory ledger (spec §12). Every stock change is an atomic,
// idempotent transaction: guard against negative stock + append an
// inventory_transactions row in the same DB transaction.

import { Prisma, type InventoryTxnType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyDelta } from "./inventory-math";

export interface InventoryTxnInput {
  productId: string;
  delta: number; // +n restock, -n deduct
  type: InventoryTxnType;
  orderId?: string | null;
  orderItemId?: string | null;
  reason?: string;
  /** Stable key so a retried effect never double-counts stock. */
  idempotencyKey: string;
}

export interface InventoryTxnResult {
  ok: boolean;
  stockAfter?: number;
  reused?: boolean;
  error?: string;
}

export async function applyInventoryTxn(input: InventoryTxnInput): Promise<InventoryTxnResult> {
  const existing = await prisma.inventoryTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { ok: true, stockAfter: existing.stockAfter, reused: true };

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: input.productId }, select: { stock: true } });
      if (!product) return { ok: false, error: "Product not found." };
      const res = applyDelta(product.stock, input.delta);
      if (!res.ok) return { ok: false, error: res.error };

      await tx.product.update({ where: { id: input.productId }, data: { stock: res.stock } });
      await tx.inventoryTransaction.create({
        data: {
          productId: input.productId,
          delta: input.delta,
          type: input.type as never,
          stockAfter: res.stock,
          orderId: input.orderId ?? null,
          orderItemId: input.orderItemId ?? null,
          reason: input.reason ?? "",
          idempotencyKey: input.idempotencyKey,
        },
      });
      return { ok: true, stockAfter: res.stock };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.inventoryTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return { ok: true, stockAfter: again.stockAfter, reused: true };
    }
    throw e;
  }
}
