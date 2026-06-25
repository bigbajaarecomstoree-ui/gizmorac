import type { NextRequest } from "next/server";
import { recordShipmentUpdate } from "@/lib/data/shipments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Shiprocket tracking webhook. Configure the URL + token in Shiprocket
// (Settings → API → Webhooks). If a token is set, the x-api-key header must match.
export async function POST(req: NextRequest) {
  // Fail closed: refuse the webhook unless its token is configured, so an
  // unauthenticated caller can't forge shipment status / tracking fields.
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected) {
    return Response.json({ ok: false, error: "webhook not configured" }, { status: 503 });
  }
  if ((req.headers.get("x-api-key") ?? "") !== expected) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  // Shiprocket sends back our order_id (the order number) plus AWB + status.
  const orderNumber =
    (body.order_id as string) ?? (body.channel_order_id as string) ?? "";
  const awb = (body.awb as string) ?? (body.awb_code as string) ?? "";
  const status =
    (body.current_status as string) ?? (body.shipment_status as string) ?? "";
  const courier = (body.courier_name as string) ?? "";

  if (!orderNumber && !awb) {
    return Response.json({ ok: false, error: "no order reference" }, { status: 400 });
  }

  await recordShipmentUpdate({
    orderNumber: orderNumber || undefined,
    awb: awb || undefined,
    status: status || undefined,
    courier: courier || undefined,
  });
  return Response.json({ ok: true });
}
