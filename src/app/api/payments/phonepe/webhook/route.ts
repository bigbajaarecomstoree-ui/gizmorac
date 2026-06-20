import type { NextRequest } from "next/server";
import { reconcilePhonePeOrder } from "@/lib/data/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PhonePe server-to-server callback. We don't trust the body — we always
// re-verify the order's status against PhonePe before updating it. If a
// webhook auth value is configured, the Authorization header must match.
export async function POST(req: NextRequest) {
  const expected = process.env.PHONEPE_WEBHOOK_AUTH;
  if (expected && (req.headers.get("authorization") ?? "") !== expected) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const payload = (body.payload ?? body.data ?? body) as Record<string, unknown>;
  const merchantOrderId =
    (payload?.merchantOrderId as string) ??
    (body.merchantOrderId as string) ??
    "";
  if (!merchantOrderId) {
    return Response.json({ ok: false, error: "no merchantOrderId" }, { status: 400 });
  }

  await reconcilePhonePeOrder(String(merchantOrderId));
  return Response.json({ ok: true });
}
