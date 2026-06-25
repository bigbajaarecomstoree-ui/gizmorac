import { reconcileStalePendingOrders } from "@/lib/data/order-reconcile";
import { logEvent } from "@/lib/data/logs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: reconcile abandoned/stale online orders so an unpaid checkout never
 * holds stock or a coupon. Vercel Cron calls this on a schedule (vercel.json).
 *
 * Auth: when CRON_SECRET is set, Vercel sends `Authorization: Bearer <secret>`
 * and we reject anything else — so the endpoint can't be triggered by the public.
 */
export async function GET(req: Request) {
  // Fail closed: an unconfigured secret means the endpoint refuses every
  // request rather than running unauthenticated.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("Cron not configured (CRON_SECRET unset).", { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await reconcileStalePendingOrders();
    if (result.released > 0 || result.paid > 0) {
      await logEvent({
        actor: "system",
        action: "cron.reconcile",
        message: `Order reconcile: ${result.released} released, ${result.paid} recovered, ${result.stillPending} pending`,
        meta: {
          scanned: result.scanned,
          paid: result.paid,
          released: result.released,
          stillPending: result.stillPending,
        },
      });
    }
    return Response.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch {
    return Response.json(
      { ok: false, error: "reconcile failed" },
      { status: 500 },
    );
  }
}
