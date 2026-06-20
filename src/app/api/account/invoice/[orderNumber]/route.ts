import type { NextRequest } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrderByNumber } from "@/lib/data/orders";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { businessFromSettings } from "@/lib/invoice/business";
import { buildInvoicePdf, type TaxInfo } from "@/lib/invoice/generate";

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

  // Per-product HSN + GST rate for the tax-invoice line items.
  const ids = order.items.map((i) => i.id);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, hsn: true, gstRate: true },
  });
  const tax: TaxInfo = new Map(
    products.map((p) => [p.id, { hsn: p.hsn, gstRate: p.gstRate }]),
  );

  const settings = await getSettings();
  const pdf = await buildInvoicePdf(order, tax, businessFromSettings(settings));
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GIZMORAC-Invoice-${order.orderNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
