import type { NextRequest } from "next/server";
import { reconcilePhonePeOrder } from "@/lib/data/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PhonePe redirects the customer here after payment. We verify the real status
// server-side (never trust the redirect), update the order, then send them to
// their order page.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("order") ?? "";

  if (orderNumber) {
    await reconcilePhonePeOrder(orderNumber);
    return Response.redirect(new URL(`/order/${orderNumber}`, url.origin), 303);
  }
  return Response.redirect(new URL("/", url.origin), 303);
}
