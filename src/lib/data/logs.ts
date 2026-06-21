import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LogLevel = "info" | "warn" | "error";
export type LogActor = "customer" | "admin" | "system";

export interface LogInput {
  level?: LogLevel;
  actor?: LogActor;
  actorId?: string;
  actorEmail?: string;
  action: string;
  message?: string;
  meta?: Record<string, unknown> | string;
  ip?: string;
  path?: string;
}

/**
 * Record an activity or error event. Fire-and-forget and fully guarded —
 * logging must NEVER throw or block the action it's recording.
 */
export async function logEvent(input: LogInput): Promise<void> {
  try {
    const meta =
      typeof input.meta === "string"
        ? input.meta
        : input.meta
          ? JSON.stringify(input.meta)
          : "";
    await prisma.eventLog.create({
      data: {
        level: input.level ?? "info",
        actor: input.actor ?? "system",
        actorId: input.actorId ?? "",
        actorEmail: input.actorEmail ?? "",
        action: input.action.slice(0, 120),
        message: (input.message ?? "").slice(0, 1000),
        meta: meta.slice(0, 4000),
        ip: (input.ip ?? "").slice(0, 60),
        path: (input.path ?? "").slice(0, 500),
      },
    });
  } catch {
    // Swallow — a failed log write should never affect the request.
  }
}

export interface LogFilter {
  level?: LogLevel | "all";
  actor?: LogActor | "all";
  q?: string;
  take?: number;
  skip?: number;
}

export async function getLogs(f: LogFilter = {}) {
  const where: Prisma.EventLogWhereInput = {};
  if (f.level && f.level !== "all") where.level = f.level;
  if (f.actor && f.actor !== "all") where.actor = f.actor;
  const q = f.q?.trim();
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
      { meta: { contains: q, mode: "insensitive" } },
    ];
  }
  const take = Math.min(200, Math.max(1, f.take ?? 50));
  const [rows, total] = await Promise.all([
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip: Math.max(0, f.skip ?? 0),
    }),
    prisma.eventLog.count({ where }),
  ]);
  return { rows, total, take };
}

export interface OrderEvent {
  id: string;
  createdAt: string;
  level: LogLevel;
  actor: LogActor;
  actorEmail: string;
  action: string;
  message: string;
}

/**
 * Full activity history for one order, oldest → newest (timeline order). Every
 * order event records the order number in its meta, so a single contains-match
 * gathers the placed / paid / status / shipping / refund / replacement events.
 */
export async function getOrderActivity(orderNumber: string): Promise<OrderEvent[]> {
  if (!orderNumber) return [];
  const rows = await prisma.eventLog.findMany({
    where: { meta: { contains: orderNumber } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    level: (r.level as LogLevel) ?? "info",
    actor: (r.actor as LogActor) ?? "system",
    actorEmail: r.actorEmail,
    action: r.action,
    message: r.message,
  }));
}

/** Counts by level over the recent window — small header summary for the UI. */
export async function getLogCounts(): Promise<{ errors: number; total: number }> {
  const [errors, total] = await Promise.all([
    prisma.eventLog.count({ where: { level: "error" } }),
    prisma.eventLog.count(),
  ]);
  return { errors, total };
}
