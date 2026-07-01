import { recordPresence, prunePresence } from "@/lib/data/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Anonymous presence heartbeat from the storefront. Body: `{ id, path }`.
 * `id` is a random per-tab token generated client-side (no cookie, no PII).
 * Best-effort and fire-and-forget: always returns 204 so a failed beacon
 * never disrupts a shopper's browsing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const path = typeof body?.path === "string" ? body.path : "";
    // Only accept ids that look like our generated token — cheap junk filter.
    if (id.length >= 8 && id.length <= 64) {
      await recordPresence(id, path);
      // Opportunistic cleanup so the table self-maintains without a cron.
      if (Math.random() < 0.05) await prunePresence();
    }
  } catch {
    // Swallow — presence is best-effort and must never surface to the visitor.
  }
  return new Response(null, { status: 204 });
}
