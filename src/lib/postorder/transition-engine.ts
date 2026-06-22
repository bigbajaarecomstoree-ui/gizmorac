// The single transition engine. NOTHING may write a post-order status field
// directly — every change flows through transitionEntity() (spec §16/§17):
// validity → role → optimistic lock → audit → side effects → notifications.

import { prisma } from "@/lib/prisma";
import { validateTransition } from "./validate";
import { deriveOrderStatus } from "./derive-order-status";
import { isTerminal, type EntityKind } from "./state-machines";
import type { Role } from "./roles";

export interface Actor {
  role: Role;
  id?: string;
  email?: string;
  ip?: string;
}

export interface TransitionInput {
  kind: EntityKind;
  id: string;
  to: string;
  actor: Actor;
  reason?: string;
  metadata?: Record<string, unknown>;
  /** CANCELLED/RTO freeze of an item → CLOSED. */
  override?: boolean;
  /** Refund-approval amount for maker-checker (paise). */
  amountPaise?: number;
}

export interface TransitionResult {
  ok: boolean;
  from?: string;
  to?: string;
  error?: string;
  conflict?: boolean;
}

const ENTITY_TYPE = {
  order: "ORDER",
  item: "ORDER_ITEM",
  dispute: "DISPUTE",
  refund: "REFUND",
} as const;

// ── Side-effect & notification registries (populated in Phases 5–7) ─────────
type SideEffect = (ctx: {
  id: string;
  orderId: string | null;
  from: string;
  to: string;
  metadata: Record<string, unknown>;
}) => Promise<void>;

export const SIDE_EFFECTS = new Map<string, SideEffect>();
export function registerSideEffect(kind: EntityKind, from: string, to: string, fn: SideEffect) {
  SIDE_EFFECTS.set(`${kind}:${from}->${to}`, fn);
}

/** Transition → customer notification event (spec §12). Email-first; other channels flagged. */
export const NOTIFY_EVENTS: Record<string, string> = {
  "item:ACTIVE->RETURN_REQUESTED": "return_requested",
  "item:UNDER_INVESTIGATION->PICKUP_SCHEDULED": "pickup_scheduled",
  "item:RETURN_REQUESTED->PICKUP_SCHEDULED": "pickup_scheduled",
  "item:PICKUP_SCHEDULED->PICKED_UP": "pickup_completed",
  "item:QC_PENDING->QC_PASSED": "qc_completed",
  "item:QC_PENDING->QC_PARTIAL": "qc_completed",
  "item:QC_PENDING->QC_FAILED": "qc_completed",
  "refund:PENDING->PROCESSING": "refund_initiated",
  "refund:PROCESSING->REFUNDED": "refund_completed",
  "item:REPLACEMENT_APPROVED->REPLACED": "replacement_shipped",
  "dispute:REJECTED->APPEALED": "appeal_decision",
  "dispute:APPEALED->UNDER_INVESTIGATION": "appeal_decision",
};

interface Flags {
  rbac: boolean;
  makerChecker: boolean;
  notifEmail: boolean;
  highValueThresholdPaise: number;
}

async function loadFlags(): Promise<Flags> {
  const s = await prisma.storeSetting.findFirst({
    select: { ffRbac: true, ffMakerChecker: true, ffNotifEmail: true, highValueRefundPaise: true },
  });
  return {
    rbac: s?.ffRbac ?? false,
    makerChecker: s?.ffMakerChecker ?? false,
    notifEmail: s?.ffNotifEmail ?? true,
    highValueThresholdPaise: s?.highValueRefundPaise ?? Number.MAX_SAFE_INTEGER,
  };
}

interface Loaded {
  state: string;
  version: number;
  orderId: string | null;
  email: string | null;
}

async function loadEntity(kind: EntityKind, id: string): Promise<Loaded | null> {
  switch (kind) {
    case "item": {
      const r = await prisma.orderItem.findUnique({
        where: { id },
        select: { status: true, version: true, orderId: true, order: { select: { email: true } } },
      });
      return r ? { state: r.status, version: r.version, orderId: r.orderId, email: r.order?.email ?? null } : null;
    }
    case "dispute": {
      const r = await prisma.dispute.findUnique({
        where: { id },
        select: { status: true, version: true, orderId: true, email: true },
      });
      return r ? { state: r.status, version: r.version, orderId: r.orderId, email: r.email } : null;
    }
    case "refund": {
      const r = await prisma.refund.findUnique({
        where: { id },
        select: { status: true, version: true, orderId: true, order: { select: { email: true } } },
      });
      return r ? { state: r.status, version: r.version, orderId: r.orderId, email: r.order?.email ?? null } : null;
    }
    case "order": {
      const r = await prisma.order.findUnique({
        where: { id },
        select: { statusV2: true, version: true, email: true },
      });
      // Pre-backfill orders may have a null statusV2; treat as PENDING for guarding.
      return r ? { state: r.statusV2 ?? "PENDING", version: r.version, orderId: id, email: r.email } : null;
    }
  }
}

function lockedUpdate(tx: typeof prisma, kind: EntityKind, id: string, version: number, to: string) {
  const data = { version: { increment: 1 } } as Record<string, unknown>;
  switch (kind) {
    case "item":
      return tx.orderItem.updateMany({ where: { id, version }, data: { ...data, status: to as never } });
    case "dispute":
      return tx.dispute.updateMany({ where: { id, version }, data: { ...data, status: to as never } });
    case "refund":
      return tx.refund.updateMany({ where: { id, version }, data: { ...data, status: to as never } });
    case "order":
      return tx.order.updateMany({ where: { id, version }, data: { ...data, statusV2: to as never } });
  }
}

/**
 * Apply one transition atomically. Validates, optimistically locks on `version`,
 * writes the mandatory audit row, then fires registered side effects and
 * notifications. Returns ok:false (never throws) on an invalid/blocked move;
 * conflict:true when a concurrent update bumped the version.
 */
export async function transitionEntity(input: TransitionInput): Promise<TransitionResult> {
  const flags = await loadFlags();
  const ent = await loadEntity(input.kind, input.id);
  if (!ent) return { ok: false, error: `${input.kind} ${input.id} not found.` };

  if (ent.state === input.to) return { ok: true, from: ent.state, to: input.to };

  const v = validateTransition({
    kind: input.kind,
    from: ent.state,
    to: input.to,
    actorRole: input.actor.role,
    flags: { rbac: flags.rbac, makerChecker: flags.makerChecker },
    override: input.override,
    amountPaise: input.amountPaise,
    highValueThresholdPaise: flags.highValueThresholdPaise,
    makerId: input.metadata?.makerId as string | undefined,
    checkerId: input.actor.id,
  });
  if (!v.ok) return { ok: false, from: ent.state, error: v.error };

  try {
    await prisma.$transaction(async (tx) => {
      const res = await lockedUpdate(tx as typeof prisma, input.kind, input.id, ent.version, input.to);
      if (res.count === 0) throw new Error("OPTIMISTIC_LOCK_CONFLICT");
      await tx.orderStatusHistory.create({
        data: {
          entityType: ENTITY_TYPE[input.kind] as never,
          entityId: input.id,
          orderId: ent.orderId,
          previousState: ent.state,
          newState: input.to,
          actorRole: input.actor.role as never,
          actorId: input.actor.id ?? "",
          actorEmail: input.actor.email ?? "",
          reason: input.reason ?? "",
          metadata: JSON.stringify(input.metadata ?? {}),
          ip: input.actor.ip ?? "",
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "OPTIMISTIC_LOCK_CONFLICT") {
      return { ok: false, from: ent.state, conflict: true, error: "Concurrent update — please retry." };
    }
    throw e;
  }

  // Post-commit side effects (refund/pickup/replacement/inventory — registered later).
  const key = `${input.kind}:${ent.state}->${input.to}`;
  const effect = SIDE_EFFECTS.get(key);
  if (effect) {
    await effect({ id: input.id, orderId: ent.orderId, from: ent.state, to: input.to, metadata: input.metadata ?? {} });
  }

  // Notifications (email-first; enqueued, sent by the Phase 7 worker).
  const event = NOTIFY_EVENTS[key];
  if (event && flags.notifEmail && ent.email) {
    await prisma.notificationLog.create({
      data: {
        orderId: ent.orderId,
        channel: "EMAIL",
        event,
        recipient: ent.email,
        state: "PENDING",
      },
    });
  }

  return { ok: true, from: ent.state, to: input.to };
}

/**
 * Recompute and persist an order's derived status from its items (spec §5),
 * through the engine so it is audited. CANCELLED/RTO are sticky overrides.
 */
export async function recomputeOrderStatus(
  orderId: string,
  actor: Actor,
  opts: { fulfillmentStatus?: string } = {},
): Promise<TransitionResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { statusV2: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const current = order.statusV2 ?? undefined;
  if (current && isTerminal("order", current)) {
    return { ok: true, from: current, to: current }; // terminal override stays
  }

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { status: true },
  });
  const target = deriveOrderStatus(
    items.map((i) => i.status),
    {
      override: current === "CANCELLED" || current === "RTO" ? current : undefined,
      fulfillmentStatus: (opts.fulfillmentStatus ?? current ?? "DELIVERED") as never,
    },
  );

  return transitionEntity({
    kind: "order",
    id: orderId,
    to: target,
    actor,
    reason: "derived from item statuses",
  });
}
