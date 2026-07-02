import type { NextRequest } from "next/server";
import { reconcilePhonePeOrder } from "@/lib/data/payments";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PhonePe redirects the customer here after payment. We verify the real status
// server-side (never trust the redirect), update the order, then send them to
// their order page — with the tracking token so guests can view it.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("order") ?? "";
  const providedToken = url.searchParams.get("t") ?? "";

  if (orderNumber) {
    await reconcilePhonePeOrder(orderNumber);
    const o = await prisma.order.findUnique({
      where: { orderNumber },
      select: { trackingToken: true },
    });
    // Only re-attach the tracking token when the caller already presented it
    // (the payment start put it on the redirect URL). Never emit it based on
    // the order number alone — otherwise anyone could enumerate order numbers
    // here and harvest tokens (→ full PII on the order page). A logged-in owner
    // needs no token; the order page authorizes them by session.
    const suffix =
      o?.trackingToken && providedToken === o.trackingToken
        ? `-${o.trackingToken}`
        : "";
    return Response.redirect(new URL(`/order/${orderNumber}${suffix}`, url.origin), 303);
  }
  return Response.redirect(new URL("/", url.origin), 303);
}
