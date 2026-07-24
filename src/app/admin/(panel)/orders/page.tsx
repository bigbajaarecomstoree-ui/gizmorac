import Link from "next/link";
import {
  IndianRupee,
  Receipt,
  Clock,
  XCircle,
  TrendingUp,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import {
  getFilteredOrders,
  ORDER_STATUSES,
  DATE_RANGES,
  type DateRange,
} from "@/lib/data/orders";
import { formatINR } from "@/lib/format";
import { OrderFilters, OrdersPageSize } from "@/components/admin/order-filters";
import { OrdersList } from "@/components/admin/orders-list";
import { PageLink } from "@/components/admin/page-link";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { canCancelOrder } from "@/lib/orders-policy";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [100, 200, 500];
const NON_REVENUE = ["Cancelled", "Returned", "Refunded"];

type SearchParams = Promise<{
  status?: string;
  range?: string;
  q?: string;
  size?: string;
  page?: string;
}>;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "ReLeaf Knee Pro Massager +1 more" — a glanceable summary of an order's items. */
function itemsLabel(order: Order): string {
  if (order.items.length === 0) return "—";
  const first = order.items[0].name.replace(/^GIZMORAC\s+/, "");
  const extra = order.items.length - 1;
  return extra > 0 ? `${first} +${extra} more` : first;
}

function hrefFor(p: {
  status?: OrderStatus | "all";
  range: DateRange;
  q: string;
  size: number;
  page?: number;
}) {
  const sp = new URLSearchParams();
  if (p.status && p.status !== "all") sp.set("status", p.status);
  if (p.range !== "all") sp.set("range", p.range);
  if (p.q) sp.set("q", p.q);
  if (p.size !== 100) sp.set("size", String(p.size));
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const qs = sp.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

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
  const size = PAGE_SIZES.includes(Number(sp.size)) ? Number(sp.size) : 100;

  // Base set = current date-range + search, ALL statuses (drives the KPI cards).
  const base = await getFilteredOrders({ status: "all", range, q });

  const revenueOrders = base.filter((o) => !NON_REVENUE.includes(o.status));
  const netRevenue = revenueOrders.reduce((s, o) => s + o.total, 0);
  const aov = revenueOrders.length ? Math.round(netRevenue / revenueOrders.length) : 0;
  const pendingCount = base.filter((o) => o.status === "Pending").length;
  const deliveredCount = base.filter((o) => o.status === "Delivered").length;
  const cancelledCount = base.filter((o) => o.status === "Cancelled").length;
  const refundedOrders = base.filter((o) => o.status === "Refunded");
  const refundAmount = refundedOrders.reduce((s, o) => s + (o.refundAmount || o.total), 0);

  // Table = base narrowed by the active status, then paginated.
  const filtered = status === "all" ? base : base.filter((o) => o.status === status);
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pageCount);
  const start = (page - 1) * size;
  const pageItems = filtered.slice(start, start + size);

  // Thumbnail (first item's product image) for each row.
  const firstItemIds = [...new Set(pageItems.map((o) => o.items[0]?.id).filter(Boolean))] as string[];
  const imgRows = firstItemIds.length
    ? await prisma.product.findMany({ where: { id: { in: firstItemIds } }, select: { id: true, image: true } })
    : [];
  const imageById = new Map(imgRows.map((p) => [p.id, p.image]));

  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label ?? "All time";

  const cards = [
    { key: "revenue", label: "Revenue", value: formatINR(netRevenue), icon: IndianRupee, target: "all" as const, highlight: false, accent: true },
    { key: "orders", label: "Orders", value: String(base.length), icon: Receipt, target: "all" as const, highlight: false },
    { key: "aov", label: "Avg order value", value: formatINR(aov), icon: TrendingUp, target: "all" as const, highlight: false },
    { key: "pending", label: "Pending", value: String(pendingCount), icon: Clock, target: "Pending" as const, highlight: true },
    { key: "delivered", label: "Delivered", value: String(deliveredCount), icon: CheckCircle2, target: "Delivered" as const, highlight: true },
    { key: "cancelled", label: "Cancelled", value: String(cancelledCount), icon: XCircle, target: "Cancelled" as const, highlight: true, danger: true },
    { key: "refunds", label: "Refunds", value: formatINR(refundAmount), icon: Undo2, target: "Refunded" as const, highlight: true },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-muted">Filter, search and manage every order.</p>

      {/* clickable KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const active = c.highlight && c.target === status;
          return (
            <Link
              key={c.key}
              href={hrefFor({ status: c.target, range, q, size })}
              aria-pressed={active}
              className={cn(
                "rounded-xl border bg-surface p-4 transition-colors hover:border-border-bright",
                active ? "border-accent ring-1 ring-accent" : "border-border",
              )}
            >
              <c.icon
                size={18}
                className={c.accent ? "text-accent" : c.danger ? "text-danger" : "text-faint"}
              />
              <div className="mt-3 text-xl font-bold tracking-tight">{c.value}</div>
              <div className="tech-label mt-1">{c.label}</div>
            </Link>
          );
        })}
      </div>

      {/* clickable status filter chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { key: "all" as const, label: "All", count: base.length },
          ...ORDER_STATUSES.map((s) => ({
            key: s,
            label: s,
            count: base.filter((o) => o.status === s).length,
          })),
        ].map((chip) => {
          const active = chip.key === status;
          return (
            <Link
              key={chip.key}
              href={hrefFor({ status: chip.key, range, q, size })}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border bg-surface text-muted hover:border-accent hover:text-accent",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-semibold",
                  active ? "bg-on-accent/20 text-on-accent" : "bg-surface-2 text-faint",
                )}
              >
                {chip.count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        <OrderFilters status={status} range={range} q={q} size={size} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-muted">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {total === 0 ? 0 : `${start + 1}–${Math.min(start + size, total)}`}
          </span>{" "}
          of {total} {status === "all" ? "" : `${status.toLowerCase()} `}
          order{total === 1 ? "" : "s"}
          <span className="text-faint"> · {rangeLabel}</span>
        </span>
        <span className="text-muted">
          Net value: <span className="readout font-semibold">{formatINR(netRevenue)}</span>
        </span>
      </div>

      <div className="mt-4">
        <OrdersList
          rows={pageItems.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            rtoStatus: o.rtoStatus,
            itemsLabel: itemsLabel(o),
            meta: `${o.firstName} ${o.lastName} · ${fmtDate(o.createdAt)}`,
            image: o.items[0] ? imageById.get(o.items[0].id) ?? null : null,
            city: o.city,
            paymentLabel:
              o.paymentMethod === "PhonePe"
                ? `${o.paymentInstrument || "UPI"} · ${o.paymentStatus || "Pending"}`
                : "COD",
            courier: o.courier,
            count: o.items.reduce((n, i) => n + i.qty, 0),
            total: o.total,
            labelUrl: o.labelUrl,
            trackingUrl: o.trackingUrl,
            hasShipment: Boolean(o.shipmentId),
            canCancel: canCancelOrder(o.status),
          }))}
        />
      </div>

      {/* page size + pagination */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <OrdersPageSize status={status} range={range} q={q} size={size} sizes={PAGE_SIZES} />

        {pageCount > 1 ? (
          <div className="flex items-center gap-4">
            <PageLink disabled={page <= 1} href={hrefFor({ status, range, q, size, page: page - 1 })} dir="prev" />
            <span className="text-sm text-muted">
              Page <span className="font-semibold text-foreground">{page}</span> of {pageCount}
            </span>
            <PageLink disabled={page >= pageCount} href={hrefFor({ status, range, q, size, page: page + 1 })} dir="next" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
