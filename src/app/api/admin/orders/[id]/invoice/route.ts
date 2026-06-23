import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getOrderById } from "@/lib/data/orders";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { businessFromSettings } from "@/lib/invoice/business";
import { buildInvoicePdf, type TaxInfo } from "@/lib/invoice/generate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Admin-only GST invoice download for any order (the customer route is gated to
// the order's owner; admins need it for every order).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Admin login required." }, { status: 401 });
  }
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const ids = order.items.map((i) => i.id);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, hsn: true, gstRate: true },
  });
  const tax: TaxInfo = new Map(products.map((p) => [p.id, { hsn: p.hsn, gstRate: p.gstRate }]));

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
