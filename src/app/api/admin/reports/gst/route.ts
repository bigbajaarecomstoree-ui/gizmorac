import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getFilteredOrders, DATE_RANGES, type DateRange } from "@/lib/data/orders";
import { prisma } from "@/lib/prisma";
import { gstStateCode, sameState } from "@/lib/india-states";
import { buildCsv } from "@/lib/products-csv";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const rangeParam = params.get("range");
  const range: DateRange = DATE_RANGES.some((r) => r.value === rangeParam)
    ? (rangeParam as DateRange)
    : "all";
  const sellerState = params.get("sellerState") ?? "";

  const custom = Boolean(from && to);
  const all = await getFilteredOrders(custom ? { from, to } : { range });
  const orders = all.filter((o) => o.status !== "Cancelled");

  // Per-product GST rate + HSN (admin-only fields).
  const products = await prisma.product.findMany({
    select: { id: true, hsn: true, gstRate: true },
  });
  const gstById = new Map(products.map((p) => [p.id, p]));

  const header = [
    "Invoice No",
    "Invoice Date",
    "Customer",
    "Place of Supply (State)",
    "State Code",
    "HSN",
    "Item",
    "GST Rate %",
    "Qty",
    "Taxable Value",
    "CGST",
    "SGST",
    "IGST",
    "Total GST",
    "Line Total",
    "Order Status",
  ];

  let tTaxable = 0,
    tCgst = 0,
    tSgst = 0,
    tIgst = 0,
    tLine = 0;

  const rows: (string | number)[][] = [];
  for (const o of orders) {
    const intra = sameState(sellerState, o.state);
    const stateCode = gstStateCode(o.state);
    for (const item of o.items) {
      const prod = gstById.get(item.id);
      const rate = prod?.gstRate ?? 18;
      const hsn = prod?.hsn ?? "";
      const lineTotal = item.price * item.qty; // GST-inclusive
      const taxable = round2(lineTotal / (1 + rate / 100));
      const totalGst = round2(lineTotal - taxable);
      const cgst = intra ? round2(totalGst / 2) : 0;
      const sgst = intra ? round2(totalGst - cgst) : 0;
      const igst = intra ? 0 : totalGst;

      tTaxable += taxable;
      tCgst += cgst;
      tSgst += sgst;
      tIgst += igst;
      tLine += lineTotal;

      rows.push([
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
        `${o.firstName} ${o.lastName}`,
        o.state,
        stateCode,
        hsn,
        item.name,
        rate,
        item.qty,
        taxable,
        cgst,
        sgst,
        igst,
        totalGst,
        lineTotal,
        o.status,
      ]);
    }
  }

  const totalRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    round2(tTaxable),
    round2(tCgst),
    round2(tSgst),
    round2(tIgst),
    round2(tCgst + tSgst + tIgst),
    round2(tLine),
    "",
  ];

  const body = buildCsv([header, ...rows, totalRow]);
  const tag = custom ? `${from}_to_${to}` : range;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-gst-${tag}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
