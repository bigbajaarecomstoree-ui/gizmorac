import type { NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrderByNumber } from "@/lib/data/orders";
import { buildInvoicePdf } from "@/lib/invoice/generate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// On-demand invoice download. Available ONLY to the logged-in customer who owns
// the order — never auto-generated, emailed, or exposed to guests/other users.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return Response.json(
      { error: "Please log in to download your invoice." },
      { status: 401 },
    );
  }

  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const owns =
    order.customerId === customer.id ||
    order.email.toLowerCase() === customer.email.toLowerCase();
  if (!owns) {
    return Response.json(
      { error: "You can only download invoices for your own orders." },
      { status: 403 },
    );
  }

  const pdf = await buildInvoicePdf(order);
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GIZMORAC-Invoice-${order.orderNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
