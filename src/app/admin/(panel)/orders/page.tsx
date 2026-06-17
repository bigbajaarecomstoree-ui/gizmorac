import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import {
  getFilteredOrders,
  ORDER_STATUSES,
  DATE_RANGES,
  type DateRange,
  type OrderFilter,
} from "@/lib/data/orders";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderFilters } from "@/components/admin/order-filters";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; range?: string; q?: string }>;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const NON_REVENUE = ["Cancelled", "Returned", "Refunded"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const status: OrderStatus | "all" =
    sp.status && ORDER_STATUSES.includes(sp.status as OrderStatus)
      ? (sp.status as OrderStatus)
      : "all";
  const range: DateRange = DATE_RANGES.some((r) => r.value === sp.range)
    ? (sp.range as DateRange)
    : "all";
  const q = (sp.q ?? "").trim();

  const filter: OrderFilter = { status, range, q };
  const orders = await getFilteredOrders(filter);

  const revenue = orders
    .filter((o) => !NON_REVENUE.includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label ?? "All time";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-muted">
        Filter, search and manage every order.
      </p>

      <div className="mt-5">
        <OrderFilters status={status} range={range} q={q} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-muted">
          Showing <span className="font-semibold text-foreground">{orders.length}</span>{" "}
          {status === "all" ? "" : `${status.toLowerCase()} `}order{orders.length === 1 ? "" : "s"}
          <span className="text-faint"> · {rangeLabel}</span>
        </span>
        <span className="text-muted">
          Net value:{" "}
          <span className="readout font-semibold">{formatINR(revenue)}</span>
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <Inbox size={32} className="text-faint" />
            <p className="mt-3 text-sm text-muted">No orders match these filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const count = o.items.reduce((n, i) => n + i.qty, 0);
              return (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {o.firstName} {o.lastName} · {o.city}, {o.state} · {fmtDate(o.createdAt)}
                    </div>
                  </div>
                  <div className="hidden text-xs text-muted sm:block">
                    {count} item{count === 1 ? "" : "s"}
                  </div>
                  <div className="w-24 text-right readout text-sm font-semibold">
                    {formatINR(o.total)}
                  </div>
                  <ChevronRight size={16} className="text-faint" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
