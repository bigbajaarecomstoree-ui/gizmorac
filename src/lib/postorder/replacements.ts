// Replacements (spec §10/§12). QC_PASSED → REPLACEMENT_APPROVED → (replacement
// order DELIVERED) → REPLACED → CLOSED. Idempotent; deducts stock on dispatch.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transitionEntity, type Actor } from "./transition-engine";
import { applyInventoryTxn } from "./inventory";

export interface ApproveReplacementResult {
  ok: boolean;
  replacementLinkId?: string;
  outOfStock?: boolean;
  reused?: boolean;
  error?: string;
}

/** Approve a replacement (idempotent). Checks stock, links the original item,
 *  and deducts inventory for the dispatch. Out of stock → caller offers refund/backorder. */
export async function approveReplacement(input: { orderItemId: string; actor: Actor }): Promise<ApproveReplacementResult> {
  const item = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    select: { id: true, status: true, qty: true, productId: true, orderId: true },
  });
  if (!item) return { ok: false, error: "Item not found." };

  const existing = await prisma.replacementOrder.findFirst({ where: { originalItemId: input.orderItemId } });
  if (existing) return { ok: true, replacementLinkId: existing.id, reused: true };

  if (item.status !== "QC_PASSED" && item.status !== "REPLACEMENT_APPROVED") {
    return { ok: false, error: `Item is ${item.status}; replacement needs QC_PASSED.` };
  }

  if (item.productId) {
    const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
    if (!product || product.stock < item.qty) {
      return { ok: false, outOfStock: true, error: "Out of stock — offer refund or backorder (needs customer approval)." };
    }
  }

  if (item.status === "QC_PASSED") {
    const t = await transitionEntity({ kind: "item", id: input.orderItemId, to: "REPLACEMENT_APPROVED", actor: input.actor, reason: "replacement approved" });
    if (!t.ok) return { ok: false, error: t.error };
  }

  try {
    const link = await prisma.replacementOrder.create({
      data: { originalOrderId: item.orderId, originalItemId: input.orderItemId, state: "APPROVED", idempotencyKey: `${input.orderItemId}-repl` },
    });
    if (item.productId) {
      await applyInventoryTxn({
        productId: item.productId,
        delta: -item.qty,
        type: "REPLACEMENT_DISPATCH",
        orderId: item.orderId,
        orderItemId: item.id,
        reason: "replacement dispatch",
        idempotencyKey: `${item.id}-repl-deduct`,
      });
    }
    return { ok: true, replacementLinkId: link.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.replacementOrder.findFirst({ where: { originalItemId: input.orderItemId } });
      if (again) return { ok: true, replacementLinkId: again.id, reused: true };
    }
    throw e;
  }
}

/** When the replacement order is DELIVERED: original item REPLACED → CLOSED. */
export async function markReplacementDelivered(replacementLinkId: string, actor: Actor = { role: "OPERATIONS" }): Promise<{ ok: boolean; error?: string }> {
  const link = await prisma.replacementOrder.findUnique({ where: { id: replacementLinkId }, select: { id: true, originalItemId: true } });
  if (!link) return { ok: false, error: "Replacement link not found." };

  await prisma.replacementOrder.update({ where: { id: link.id }, data: { state: "DELIVERED", deliveredAt: new Date() } });
  const t1 = await transitionEntity({ kind: "item", id: link.originalItemId, to: "REPLACED", actor, reason: "replacement delivered" });
  if (!t1.ok) return { ok: false, error: t1.error };
  await transitionEntity({ kind: "item", id: link.originalItemId, to: "CLOSED", actor, reason: "replaced → closed" });
  return { ok: true };
}
