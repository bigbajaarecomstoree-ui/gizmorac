import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcilePhonePeOrder, reconcileRefund } from "@/lib/data/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PhonePe server-to-server callback. We don't trust the body — we always
// re-verify status against PhonePe before updating anything. If a webhook auth
// value is configured, the Authorization header must match.
export async function POST(req: NextRequest) {
  // Fail closed: refuse the webhook unless its auth value is configured.
  // (Payments still reconcile via the redirect callback + cron, so this can't
  // lose a payment — it only blocks unauthenticated calls.)
  const expected = process.env.PHONEPE_WEBHOOK_AUTH;
  if (!expected) {
    return Response.json({ ok: false, error: "webhook not configured" }, { status: 503 });
  }
  if ((req.headers.get("authorization") ?? "") !== expected) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const payload = (body.payload ?? body.data ?? body) as Record<string, unknown>;

  // Refund event → re-verify the refund and update the linked order.
  const merchantRefundId =
    (payload?.merchantRefundId as string) ?? (body.merchantRefundId as string) ?? "";
  if (merchantRefundId) {
    const order = await prisma.order.findFirst({
      where: { refundRef: String(merchantRefundId) },
      select: { id: true },
    });
    if (order) await reconcileRefund(order.id);
    return Response.json({ ok: true });
  }

  // Otherwise treat it as a payment event.
  const merchantOrderId =
    (payload?.merchantOrderId as string) ?? (body.merchantOrderId as string) ?? "";
  if (!merchantOrderId) {
    return Response.json({ ok: false, error: "no merchantOrderId" }, { status: 400 });
  }

  await reconcilePhonePeOrder(String(merchantOrderId));
  return Response.json({ ok: true });
}
