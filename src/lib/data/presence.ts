import { prisma } from "@/lib/prisma";

// A visitor counts as "online" for this long after their last heartbeat. Kept
// comfortably above the client ping interval (~20s) so a live tab is never
// dropped between two pings.
const ACTIVE_WINDOW_MS = 45_000;
// Rows older than this are dead sessions — deleted so the table stays tiny.
const PRUNE_AFTER_MS = 10 * 60_000;

// Bounds on client-supplied strings (the heartbeat endpoint is public).
const MAX_ID = 64;
const MAX_PATH = 256;

/** Record or refresh one visitor's heartbeat. `id` is a random per-tab token. */
export async function recordPresence(id: string, path: string): Promise<void> {
  const key = id.slice(0, MAX_ID);
  const trimmedPath = path.slice(0, MAX_PATH);
  const lastSeen = new Date();
  await prisma.liveVisitor.upsert({
    where: { id: key },
    create: { id: key, path: trimmedPath, lastSeen },
    update: { path: trimmedPath, lastSeen },
  });
}

/** Visitors seen within the active window — the real "online now" number. */
export async function getLiveVisitorCount(): Promise<number> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  return prisma.liveVisitor.count({ where: { lastSeen: { gte: since } } });
}

/** Delete dead sessions. Cheap; called opportunistically from the heartbeat. */
export async function prunePresence(): Promise<void> {
  const cutoff = new Date(Date.now() - PRUNE_AFTER_MS);
  await prisma.liveVisitor.deleteMany({ where: { lastSeen: { lt: cutoff } } });
}
