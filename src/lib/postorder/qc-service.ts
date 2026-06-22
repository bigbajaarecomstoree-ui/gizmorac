// Warehouse QC (spec §7/§8/§12): record the inspection, transition the item,
// reconcile inventory, and auto-route to the resolution. Auto-pass behind
// ffAutoQc (no QC staff yet — approved 2026-06-22).

import type { QcResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transitionEntity, type Actor } from "./transition-engine";
import { qcNextItemStatus, qcRestocksInventory, type QcResolution } from "./qc";
import { applyInventoryTxn } from "./inventory";
import type { Role } from "./roles";

const QC_STATE: Record<Exclude<QcResult, "PENDING">, string> = {
  PASSED: "QC_PASSED",
  PARTIAL: "QC_PARTIAL",
  FAILED: "QC_FAILED",
};

export interface RunQcInput {
  orderItemId: string;
  result: Exclude<QcResult, "PENDING">;
  resolution?: QcResolution; // PASSED → refund or replacement
  deductionPaise?: number; // PARTIAL restocking deduction
  checklist?: Partial<{ conditionOk: boolean; serialOk: boolean; accessoriesOk: boolean; functionalOk: boolean; packagingOk: boolean }>;
  notes?: string;
  actor: Actor;
  auto?: boolean;
}

export async function runQc(input: RunQcInput): Promise<{ ok: boolean; next?: string; error?: string }> {
  const item = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    select: { id: true, status: true, qty: true, productId: true },
  });
  if (!item) return { ok: false, error: "Item not found." };
  if (item.status !== "QC_PENDING") return { ok: false, error: `Item is ${item.status}, not QC_PENDING.` };

  const pass = input.result !== "FAILED";
  await prisma.qcReport.create({
    data: {
      orderItemId: input.orderItemId,
      result: input.result as never,
      conditionOk: input.checklist?.conditionOk ?? pass,
      serialOk: input.checklist?.serialOk ?? pass,
      accessoriesOk: input.checklist?.accessoriesOk ?? pass,
      functionalOk: input.checklist?.functionalOk ?? pass,
      packagingOk: input.checklist?.packagingOk ?? pass,
      deductionPaise: input.deductionPaise ?? 0,
      notes: input.notes ?? (input.auto ? "auto-QC (ffAutoQc)" : ""),
      inspectedBy: input.actor.email ?? input.actor.role,
    },
  });

  // QC_PENDING → QC_PASSED/PARTIAL/FAILED
  const t1 = await transitionEntity({ kind: "item", id: input.orderItemId, to: QC_STATE[input.result], actor: input.actor, reason: `QC ${input.result}` });
  if (!t1.ok) return { ok: false, error: t1.error };

  // Inventory: PASS/PARTIAL → sellable restock; FAIL → damaged bucket (no sellable +).
  if (item.productId) {
    if (qcRestocksInventory(input.result)) {
      await applyInventoryTxn({ productId: item.productId, delta: item.qty, type: "RESTOCK_QC_PASS", orderItemId: item.id, reason: `QC ${input.result} restock`, idempotencyKey: `${item.id}-restock` });
    } else {
      await applyInventoryTxn({ productId: item.productId, delta: 0, type: "DAMAGE_QC_FAIL", orderItemId: item.id, reason: "QC failed — damaged bucket", idempotencyKey: `${item.id}-damage` });
    }
  }

  // Auto-route to resolution (REFUND_APPROVED / REPLACEMENT_APPROVED / REJECTED).
  const next = qcNextItemStatus(input.result, input.resolution ?? "refund");
  if (next !== QC_STATE[input.result]) {
    const role: Role = next === "REFUND_APPROVED" ? "FINANCE" : next === "REPLACEMENT_APPROVED" ? "OPERATIONS" : "QC";
    const t2 = await transitionEntity({ kind: "item", id: input.orderItemId, to: next, actor: { role }, reason: `auto-route after QC ${input.result}`, amountPaise: 0 });
    if (!t2.ok) return { ok: false, error: t2.error };
    if (input.result === "PARTIAL" && input.deductionPaise) {
      await prisma.orderItem.update({ where: { id: input.orderItemId }, data: { deductionPaise: input.deductionPaise, deductionReason: input.notes ?? "restocking deduction" } });
    }
  }
  return { ok: true, next };
}
