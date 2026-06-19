import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getFilteredOrders, DATE_RANGES, type DateRange } from "@/lib/data/orders";
import { gstStateCode, sameState } from "@/lib/india-states";

export const dynamic = "force-dynamic";

function csv(value: string | number): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

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
  const rate = Math.max(0, Number(params.get("rate")) || 18); // % GST, default 18
  const sellerState = params.get("sellerState") ?? "";

  const custom = Boolean(from && to);
  const all = await getFilteredOrders(custom ? { from, to } : { range });
  // GST is reported on invoices issued — exclude cancelled (no supply).
  const orders = all.filter((o) => o.status !== "Cancelled");

  const header = [
    "Invoice No",
    "Invoice Date",
    "Customer",
    "Customer GSTIN",
    "Place of Supply (State)",
    "State Code",
    "Order Status",
    "Taxable Value",
    "GST Rate %",
    "CGST",
    "SGST",
    "IGST",
    "Total GST",
    "Invoice Value",
    "Payment",
  ];

  let tTaxable = 0,
    tCgst = 0,
    tSgst = 0,
    tIgst = 0,
    tInvoice = 0;

  const rows = orders.map((o) => {
    const invoiceValue = o.total;
    // Prices are GST-inclusive (Indian MRP convention) → back-calculate.
    const taxable = round2(invoiceValue / (1 + rate / 100));
    const totalGst = round2(invoiceValue - taxable);
    const intra = sameState(sellerState, o.state);
    const cgst = intra ? round2(totalGst / 2) : 0;
    const sgst = intra ? round2(totalGst - cgst) : 0;
    const igst = intra ? 0 : totalGst;

    tTaxable += taxable;
    tCgst += cgst;
    tSgst += sgst;
    tIgst += igst;
    tInvoice += invoiceValue;

    return [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString("en-IN"),
      `${o.firstName} ${o.lastName}`,
      "", // B2C — no customer GSTIN captured
      o.state,
      gstStateCode(o.state),
      o.status,
      taxable,
      rate,
      cgst,
      sgst,
      igst,
      totalGst,
      invoiceValue,
      o.paymentMethod,
    ]
      .map(csv)
      .join(",");
  });

  const totalRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    round2(tTaxable),
    "",
    round2(tCgst),
    round2(tSgst),
    round2(tIgst),
    round2(tCgst + tSgst + tIgst),
    round2(tInvoice),
    "",
  ]
    .map(csv)
    .join(",");

  const body =
    "﻿" + [header.map(csv).join(","), ...rows, totalRow].join("\r\n");
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
