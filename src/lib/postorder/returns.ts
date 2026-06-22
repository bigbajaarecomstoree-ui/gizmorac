// Return lifecycle (spec §3/§7/§8): entry, investigation routing, idempotent
// reverse pickup, receipt → QC. ReturnReason drives routing via the matrix.

import type { ReturnReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transitionEntity, type Actor } from "./transition-engine";
import { canRequestReturn } from "./returns-policy";
import { entryTargetFor } from "./return-matrix";
import { runQc } from "./qc-service";
import { getOrderById } from "@/lib/data/orders";
import { createReturnOrder, shipReturn } from "@/lib/shiprocket";

async function settings() {
  const s = await prisma.storeSetting.findFirst({ select: { returnWindowDays: true, ffAutoQc: true } });
  return { returnWindowDays: s?.returnWindowDays ?? 7, autoQc: s?.ffAutoQc ?? true };
}

/** ACTIVE → RETURN_REQUESTED with eligibility + reason, then route per matrix. */
export async function requestReturn(input: {
  orderItemId: string;
  reason: ReturnReason;
  actor: Actor;
  customerDamaged?: boolean;
  returnableCategory?: boolean;
}): Promise<{ ok: boolean; target?: string; error?: string }> {
  const item = await prisma.orderItem.findUnique({
    where: { id: input.orderItemId },
    select: { id: true, status: true, order: { select: { deliveredAt: true } } },
  });
  if (!item) return { ok: false, error: "Item not found." };

  const cfg = await settings();
  const elig = canRequestReturn({
    itemStatus: item.status,
    deliveredAt: item.order.deliveredAt,
    returnWindowDays: cfg.returnWindowDays,
    returnableCategory: input.returnableCategory ?? true,
    customerDamaged: Boolean(input.customerDamaged),
  });
  if (!elig.ok) return { ok: false, error: elig.reason };

  const entry = await transitionEntity({ kind: "item", id: input.orderItemId, to: "RETURN_REQUESTED", actor: input.actor, reason: `return: ${input.reason}`, metadata: { reason: input.reason } });
  if (!entry.ok) return { ok: false, error: entry.error };
  await prisma.orderItem.update({ where: { id: input.orderItemId }, data: { returnReason: input.reason } });

  // Matrix decides the next stop: investigation reasons hold; others schedule pickup.
  if (entryTargetFor(input.reason) === "UNDER_INVESTIGATION") {
    const t = await transitionEntity({ kind: "item", id: input.orderItemId, to: "UNDER_INVESTIGATION", actor: { role: "SUPPORT" }, reason: "investigation required by reason" });
    return { ok: t.ok, target: "UNDER_INVESTIGATION", error: t.error };
  }
  const p = await scheduleReturnPickup({ orderItemId: input.orderItemId, actor: { role: "OPERATIONS" } });
  return { ok: p.ok, target: "PICKUP_SCHEDULED", error: p.error };
}

/** Idempotent reverse pickup: one ReversePickup per item; best-effort Shiprocket. */
export async function scheduleReturnPickup(input: { orderItemId: string; actor: Actor }): Promise<{ ok: boolean; reused?: boolean; error?: string }> {
  const item = await prisma.orderItem.findUnique({ where: { id: input.orderItemId }, select: { id: true, status: true, orderId: true } });
  if (!item) return { ok: false, error: "Item not found." };

  const existing = await prisma.reversePickup.findFirst({ where: { orderItemId: input.orderItemId, status: { in: ["SCHEDULED", "PICKED_UP"] } } });
  if (existing) {
    if (item.status === "RETURN_REQUESTED" || item.status === "UNDER_INVESTIGATION") {
      await transitionEntity({ kind: "item", id: input.orderItemId, to: "PICKUP_SCHEDULED", actor: input.actor, reason: "pickup already scheduled" });
    }
    return { ok: true, reused: true };
  }

  // Best-effort Shiprocket reverse pickup (full per-item payload refined at the switch).
  let providerOrderId = "", shipmentId = "", awb = "", courier = "";
  try {
    const order = await getOrderById(item.orderId);
    if (order) {
      const ret = await createReturnOrder(order);
      if (ret.ok && ret.shipmentId) {
        providerOrderId = ret.shiprocketOrderId ?? "";
        shipmentId = ret.shipmentId;
        const s = await shipReturn(shipmentId);
        if (s.ok) {
          awb = s.awb ?? "";
          courier = s.courier ?? "";
        }
      }
    }
  } catch {
    /* best-effort — the pickup row is still recorded for retry */
  }

  await prisma.reversePickup
    .create({
      data: {
        orderId: item.orderId,
        orderItemId: input.orderItemId,
        provider: "shiprocket",
        providerOrderId,
        shipmentId,
        awb,
        courier,
        status: "SCHEDULED",
        idempotencyKey: `${input.orderItemId}-rp`,
        scheduledAt: new Date(),
      },
    })
    .catch(() => {}); // unique key → already created concurrently

  const t = await transitionEntity({ kind: "item", id: input.orderItemId, to: "PICKUP_SCHEDULED", actor: input.actor, reason: "reverse pickup scheduled" });
  return { ok: t.ok, error: t.error };
}

export async function markPickedUp(orderItemId: string, actor: Actor = { role: "OPERATIONS" }): Promise<{ ok: boolean; error?: string }> {
  await prisma.reversePickup.updateMany({ where: { orderItemId, status: "SCHEDULED" }, data: { status: "PICKED_UP", pickedUpAt: new Date() } });
  const t = await transitionEntity({ kind: "item", id: orderItemId, to: "PICKED_UP", actor, reason: "picked up" });
  return { ok: t.ok, error: t.error };
}

/** Receive at warehouse → QC_PENDING; auto-run QC when ffAutoQc is on. */
export async function receiveForQc(orderItemId: string, actor: Actor = { role: "OPERATIONS" }): Promise<{ ok: boolean; error?: string }> {
  const t = await transitionEntity({ kind: "item", id: orderItemId, to: "QC_PENDING", actor, reason: "received at warehouse" });
  if (!t.ok) return { ok: false, error: t.error };

  const cfg = await settings();
  if (cfg.autoQc) {
    await runQc({ orderItemId, result: "PASSED", actor: { role: "QC" }, auto: true });
  }
  return { ok: true };
}
