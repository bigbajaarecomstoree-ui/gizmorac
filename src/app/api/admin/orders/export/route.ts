import type { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getFilteredOrders, DATE_RANGES, type DateRange } from "@/lib/data/orders";

export const dynamic = "force-dynamic";

function csv(value: string | number): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

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

  const custom = Boolean(from && to);
  const orders = await getFilteredOrders(
    custom ? { from, to } : { range },
  );
  const tag = custom ? `${from}_to_${to}` : range;

  const header = [
    "Order Number",
    "Date",
    "Customer",
    "Email",
    "Phone",
    "City",
    "State",
    "Pincode",
    "Status",
    "Items",
    "Subtotal",
    "Discount",
    "Shipping",
    "Total",
    "Payment",
    "Coupon",
  ];

  const rows = orders.map((o) => {
    const items = o.items.map((i) => `${i.name} x${i.qty}`).join("; ");
    return [
      o.orderNumber,
      new Date(o.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      `${o.firstName} ${o.lastName}`,
      o.email,
      o.phone,
      o.city,
      o.state,
      o.pincode,
      o.status,
      items,
      o.subtotal,
      o.discount,
      o.shipping,
      o.total,
      o.paymentMethod,
      o.couponCode ?? "",
    ]
      .map(csv)
      .join(",");
  });

  const body = "﻿" + [header.map(csv).join(","), ...rows].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-orders-${tag}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
