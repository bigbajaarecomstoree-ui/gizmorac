import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/data/logs";
import { issueRepeatCoupon } from "@/lib/data/rewards";
import { getTracking, type TrackingResult } from "@/lib/shiprocket";

// Single sync engine for courier → store status. Every entry point funnels
// through applyShipmentUpdate: the Shiprocket webhook, the daily cron sweep,
// the admin "Sync tracking" button, and the on-view refresh both order pages
// run. All money/inventory side effects stay manual admin actions — the sync
// records reality (status, RTO sub-state) but never collects cash or restocks.

/** Order states a courier update may advance FROM (never out of a terminal state). */
const PRE_SHIPPED = ["Pending", "Confirmed", "Packed"];
const PRE_DELIVERED = [...PRE_SHIPPED, "Shipped"];

/** Map a Shiprocket status label to our order status (only ever moves forward). */
export function orderStatusFromShipment(
  label: string,
  current: string,
): string | null {
  const s = (label || "").toLowerCase();
  // RTO / return / cancel labels describe the parcel coming BACK (or not going
  // at all) — they must never read as a customer delivery: "RTO Delivered"
  // means delivered back to the WAREHOUSE, and "Undelivered" contains
  // "delivered" too.
  if (s.includes("rto") || s.includes("return") || s.includes("cancel")) return null;
  if (s.includes("undelivered")) return null;
  if (s.includes("delivered")) {
    return PRE_DELIVERED.includes(current) ? "Delivered" : null;
  }
  if (
    s.includes("transit") ||
    s.includes("out for delivery") ||
    s.includes("shipped") ||
    s.includes("dispatched") ||
    s.includes("picked")
  ) {
    return PRE_SHIPPED.includes(current) ? "Shipped" : null;
  }
  return null;
}

/**
 * Map a courier label onto the RTO sub-state (forward-only, mirroring the
 * admin COD/RTO actions). RTO_RECEIVED is deliberately NOT reachable here —
 * restock + advance forfeit need a human confirming the parcel physically
 * arrived back, via the admin "RTO received" button.
 */
export function rtoStatusFromShipment(
  label: string,
  current: string,
): string | null {
  const s = (label || "").toLowerCase();
  if (s.includes("rto") || s.includes("return to origin")) {
    return current === "NONE" || current === "DELIVERY_FAILED" ? "RTO_INITIATED" : null;
  }
  if (
    s.includes("undelivered") ||
    s.includes("delivery failed") ||
    s.includes("failed delivery")
  ) {
    return current === "NONE" ? "DELIVERY_FAILED" : null;
  }
  return null;
}

const SYNC_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  rtoStatus: true,
  shipmentStatus: true,
  shipmentId: true,
  awb: true,
  courier: true,
  trackingUrl: true,
  customerId: true,
  email: true,
} as const;

interface SyncRow {
  id: string;
  orderNumber: string;
  status: string;
  rtoStatus: string;
  shipmentStatus: string;
  shipmentId: string;
  awb: string;
  courier: string;
  trackingUrl: string;
  customerId: string | null;
  email: string;
}

/** Audit row + event log carrying before/after values (same shape as admin ops). */
async function auditSystem(
  order: { id: string; orderNumber: string },
  field: string,
  previous: string,
  next: string,
  action: string,
  message: string,
) {
  await prisma.orderStatusHistory.create({
    data: {
      entityType: "ORDER",
      entityId: order.id,
      orderId: order.id,
      previousState: previous,
      newState: next,
      actorRole: "SYSTEM",
      reason: action,
    },
  });
  await logEvent({
    actor: "system",
    action,
    message,
    meta: { orderId: order.id, orderNumber: order.orderNumber, field, previous, next },
  });
}

interface ShipmentUpdateInput {
  status?: string;
  awb?: string;
  courier?: string;
  trackingUrl?: string;
}

interface ApplyResult {
  changed: boolean;
  orderStatus?: string;
  rtoStatus?: string;
}

async function applyShipmentUpdate(
  order: SyncRow,
  input: ShipmentUpdateInput,
  opts: { revalidate: boolean; source: string },
): Promise<ApplyResult> {
  const label = (input.status || "").trim();
  const res: ApplyResult = { changed: false };
  let changed = false;

  // 1) Tracking fields: latest courier label + backfill AWB/courier/URL.
  const fields: Record<string, string> = {};
  if (label && label !== order.shipmentStatus) fields.shipmentStatus = label;
  if (input.awb && input.awb !== order.awb) fields.awb = input.awb;
  if (input.courier && input.courier !== order.courier) fields.courier = input.courier;
  if (input.trackingUrl && input.trackingUrl !== order.trackingUrl) {
    fields.trackingUrl = input.trackingUrl;
  }
  const labelIsNew = fields.shipmentStatus !== undefined;
  if (Object.keys(fields).length > 0) {
    await prisma.order.update({ where: { id: order.id }, data: fields });
    changed = true;
  }

  // 2) Order-status advance. CAS on the allowed pre-states so a stale or
  //    duplicate update can never resurrect a cancelled/refunded order.
  const nextStatus = label ? orderStatusFromShipment(label, order.status) : null;
  if (nextStatus) {
    const allowed = nextStatus === "Delivered" ? PRE_DELIVERED : PRE_SHIPPED;
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, status: { in: allowed } },
      data: {
        status: nextStatus,
        ...(nextStatus === "Delivered" ? { deliveredAt: new Date() } : {}),
      },
    });
    if (claimed.count > 0) {
      changed = true;
      res.orderStatus = nextStatus;
      await auditSystem(
        order,
        "status",
        order.status,
        nextStatus,
        `shipment.${nextStatus.toLowerCase()}`,
        `Order ${order.orderNumber} → ${nextStatus} (Shiprocket: ${label}, via ${opts.source})`,
      );
      // Mirror the admin "Delivered" path (idempotent — guards on an existing reward).
      if (nextStatus === "Delivered") {
        await issueRepeatCoupon({
          id: order.id,
          customerId: order.customerId,
          email: order.email,
        });
      }
    }
  }

  // 3) RTO sub-state advance (CAS, forward-only).
  const nextRto = label ? rtoStatusFromShipment(label, order.rtoStatus) : null;
  if (nextRto) {
    const allowed = nextRto === "RTO_INITIATED" ? ["NONE", "DELIVERY_FAILED"] : ["NONE"];
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, rtoStatus: { in: allowed } },
      data: { rtoStatus: nextRto },
    });
    if (claimed.count > 0) {
      changed = true;
      res.rtoStatus = nextRto;
      await auditSystem(
        order,
        "rtoStatus",
        order.rtoStatus,
        nextRto,
        nextRto === "RTO_INITIATED" ? "shipment.rto_initiated" : "shipment.delivery_failed",
        nextRto === "RTO_INITIATED"
          ? `RTO detected for ${order.orderNumber} — parcel returning to origin (Shiprocket: ${label})`
          : `Delivery attempt failed for ${order.orderNumber} (Shiprocket: ${label})`,
      );
    }
  }

  // A parcel arriving back at the warehouse still needs a human: flag it once,
  // but leave "RTO received" (restock + advance forfeit) to the admin button.
  const lower = label.toLowerCase();
  if (
    labelIsNew &&
    lower.includes("rto") &&
    lower.includes("delivered") &&
    order.rtoStatus !== "RTO_RECEIVED"
  ) {
    await logEvent({
      actor: "system",
      action: "shipment.rto_back_at_origin",
      message: `RTO parcel for ${order.orderNumber} reached the origin hub — confirm receipt in the order's COD & RTO panel to restock.`,
      meta: { orderId: order.id, orderNumber: order.orderNumber },
    });
  }

  if (changed && opts.revalidate) {
    revalidatePath(`/order/${order.orderNumber}`);
    revalidatePath("/account");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${order.id}`);
  }
  res.changed = changed;
  return res;
}

async function findSyncRow(ref: {
  orderNumber?: string;
  awb?: string;
}): Promise<SyncRow | null> {
  if (ref.orderNumber) {
    return prisma.order.findUnique({
      where: { orderNumber: ref.orderNumber },
      select: SYNC_SELECT,
    });
  }
  if (ref.awb) {
    return prisma.order.findFirst({ where: { awb: ref.awb }, select: SYNC_SELECT });
  }
  return null;
}

/**
 * Apply a shipment update to the matching order (by our order number or AWB)
 * from caller-supplied fields — the webhook's fallback when the live API is
 * unreachable. Prefer syncOrderTracking, which re-verifies with Shiprocket.
 */
export async function recordShipmentUpdate(input: {
  orderNumber?: string;
  awb?: string;
  status?: string;
  courier?: string;
  trackingUrl?: string;
}): Promise<boolean> {
  const order = await findSyncRow(input);
  if (!order) return false;
  await applyShipmentUpdate(order, input, { revalidate: true, source: "webhook-payload" });
  return true;
}

export interface SyncOutcome {
  ok: boolean;
  changed: boolean;
  tracking: TrackingResult | null;
  error?: string;
}

/**
 * Authoritative sync: fetch live tracking from Shiprocket's API and apply it.
 * Used by the webhook (re-verify, never trust the payload), the cron sweep,
 * the admin button, and the on-view refresh.
 */
export async function syncOrderTracking(
  ref: { orderId?: string; orderNumber?: string; awb?: string },
  opts?: { revalidate?: boolean; source?: string },
): Promise<SyncOutcome> {
  const order = ref.orderId
    ? await prisma.order.findUnique({ where: { id: ref.orderId }, select: SYNC_SELECT })
    : await findSyncRow(ref);
  if (!order) return { ok: false, changed: false, tracking: null, error: "Order not found." };
  if (!order.shipmentId) {
    return { ok: false, changed: false, tracking: null, error: "No shipment yet." };
  }
  const t = await getTracking(order.shipmentId);
  if (!t) {
    return {
      ok: false,
      changed: false,
      tracking: null,
      error: "Couldn't fetch tracking right now.",
    };
  }
  const applied = await applyShipmentUpdate(
    order,
    { status: t.status, awb: t.awb, courier: t.courier, trackingUrl: t.trackingUrl },
    { revalidate: opts?.revalidate ?? true, source: opts?.source ?? "sync" },
  );
  return { ok: true, changed: applied.changed, tracking: t };
}

/**
 * Daily cron sweep: refresh every order with a live shipment so statuses stay
 * true even if the Shiprocket webhook is missed or unconfigured. Delivered /
 * cancelled orders (with no active RTO) are left alone.
 */
export async function syncActiveShipments(
  limit = 25,
): Promise<{ scanned: number; updated: number }> {
  const rows = await prisma.order.findMany({
    where: {
      shipmentId: { not: "" },
      OR: [
        { status: { in: ["Confirmed", "Packed", "Shipped"] } },
        { rtoStatus: { in: ["DELIVERY_FAILED", "RTO_INITIATED"] } },
      ],
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: SYNC_SELECT,
  });
  let updated = 0;
  for (const row of rows) {
    const t = await getTracking(row.shipmentId);
    if (!t) continue;
    const r = await applyShipmentUpdate(
      row,
      { status: t.status, awb: t.awb, courier: t.courier, trackingUrl: t.trackingUrl },
      { revalidate: true, source: "cron" },
    );
    if (r.changed) updated++;
  }
  return { scanned: rows.length, updated };
}

export interface LiveTracking {
  tracking: TrackingResult | null;
  /** True when this refresh changed the order row — callers should re-read it. */
  changed: boolean;
}

// On-view refresh throttle: at most one Shiprocket call per shipment per
// 5 minutes per server instance; in between, views reuse the cached result.
const VIEW_TTL_MS = 5 * 60 * 1000;
const viewCache = new Map<string, { at: number; tracking: TrackingResult | null }>();

function isTrackable(order: { status: string; rtoStatus: string; shipmentId: string }): boolean {
  if (!order.shipmentId) return false;
  if (["Confirmed", "Packed", "Shipped"].includes(order.status)) return true;
  return order.rtoStatus === "DELIVERY_FAILED" || order.rtoStatus === "RTO_INITIATED";
}

/**
 * Live tracking for an order page view: fetches from Shiprocket (throttled),
 * writes any status change through to the order, and returns the courier's
 * activity feed for display. No path revalidation — both order pages are
 * force-dynamic, and revalidatePath can't run during render.
 */
export async function getLiveTracking(order: {
  id: string;
  status: string;
  rtoStatus: string;
  shipmentId: string;
}): Promise<LiveTracking> {
  if (!isTrackable(order)) return { tracking: null, changed: false };
  const hit = viewCache.get(order.shipmentId);
  if (hit && Date.now() - hit.at < VIEW_TTL_MS) {
    return { tracking: hit.tracking, changed: false };
  }
  const res = await syncOrderTracking(
    { orderId: order.id },
    { revalidate: false, source: "page-view" },
  ).catch(() => null);
  const tracking = res?.tracking ?? null;
  viewCache.set(order.shipmentId, { at: Date.now(), tracking });
  return { tracking, changed: Boolean(res?.changed) };
}
