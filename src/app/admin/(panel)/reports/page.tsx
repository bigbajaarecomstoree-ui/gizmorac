import Link from "next/link";
import {
  BarChart3,
  Download,
  Receipt,
  IndianRupee,
  Boxes,
  Clock,
  Truck,
  Inbox,
  Wallet,
  HandCoins,
} from "lucide-react";
import { getReportSummary, getReportSummaryBetween } from "@/lib/data/orders";
import { getClosingStock } from "@/lib/data/queries";
import { formatINR, formatCount } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { DateRangeBar, parseDateRange } from "@/components/admin/date-range-bar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

const HIGHLIGHT = ["Cancelled", "Returned", "Refunded"];

type Kpi = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: boolean;
};

function KpiGroup({ title, items }: { title: string; items: Kpi[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <k.icon size={18} className={k.accent ? "text-accent" : "text-faint"} />
            <div className="mt-3 text-xl font-bold tracking-tight">{k.value}</div>
            <div className="tech-label mt-1">{k.label}</div>
            {k.sub ? <div className="mt-1 text-xs text-faint">{k.sub}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { custom, range, rangeLabel } = parseDateRange(sp);

  const [report, stock] = await Promise.all([
    custom ? getReportSummaryBetween(sp.from, sp.to) : getReportSummary(range),
    getClosingStock(),
  ]);

  const exportHref = custom
    ? `/api/admin/orders/export?from=${sp.from}&to=${sp.to}`
    : `/api/admin/orders/export?range=${range}`;

  const salesKpis: Kpi[] = [
    { label: "Total Sales", value: formatINR(report.revenue), icon: IndianRupee, accent: true },
    { label: "Cash Collected", value: formatINR(report.collected), sub: "Delivered (COD)", icon: Wallet },
    { label: "Payment to Receive", value: formatINR(report.toReceive), sub: "Open orders", icon: HandCoins },
  ];
  const orderKpis: Kpi[] = [
    { label: "Total Orders", value: String(report.orders), icon: Receipt },
    { label: "Pending Orders", value: String(report.pending), sub: "Awaiting action", icon: Clock },
    { label: "Open Orders", value: String(report.open), sub: "Not yet delivered", icon: Truck },
  ];
  const inventoryKpis: Kpi[] = [
    {
      label: "Closing Stock",
      value: `${formatCount(stock.units)} units`,
      sub: `${formatINR(stock.value)} · ${stock.skus} SKUs`,
      icon: Boxes,
    },
  ];

  const maxCount = Math.max(1, ...report.byStatus.map((s) => s.count));
  const financeHref = custom
    ? `/admin/finance?from=${sp.from}&to=${sp.to}`
    : `/admin/finance?range=${range}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <BarChart3 size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Sales report</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Sales and order performance · {rangeLabel}
      </p>

      {/* Unified controls: date presets + custom range + export, all in one bar */}
      <DateRangeBar
        basePath="/admin/reports"
        defaultRange="30d"
        range={range}
        custom={custom}
        from={sp.from}
        to={sp.to}
      >
        <a
          href={exportHref}
          download
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent"
        >
          <Download size={16} /> Export
        </a>
      </DateRangeBar>

      {/* Sales */}
      <KpiGroup title="Sales" items={salesKpis} />

      {/* Orders */}
      <KpiGroup title="Orders" items={orderKpis} />

      {/* Orders by status (under Orders) */}
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        <h3 className="border-b border-border px-5 py-3 text-sm font-semibold">
          Orders by status
        </h3>
        {report.orders === 0 ? (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <Inbox size={28} className="text-faint" />
            <p className="mt-3 text-sm font-medium text-muted">
              No orders in this period
            </p>
            <p className="mt-1 text-xs text-faint">
              Once orders come in, the breakdown by status appears here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {report.byStatus
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.status} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-28 shrink-0">
                    <OrderStatusBadge status={s.status} />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={
                          HIGHLIGHT.includes(s.status)
                            ? "h-full rounded-full bg-danger/60"
                            : "h-full rounded-full bg-accent"
                        }
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-semibold tabular-nums">
                    {s.count}
                  </div>
                  <div className="hidden w-28 text-right text-sm text-muted sm:block">
                    {formatINR(s.value)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Inventory */}
      <KpiGroup title="Inventory" items={inventoryKpis} />

      {/* Profit & tax */}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-muted">Profit &amp; tax</h2>
      <Link
        href={financeHref}
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-accent"
      >
        <span className="text-muted">
          Gross Profit{" "}
          <span className="font-semibold text-foreground">
            {formatINR(report.grossProfit)}
          </span>{" "}
          · {report.margin}% margin
        </span>
        <span className="font-medium text-accent">Full Profit &amp; Loss →</span>
      </Link>

      <p className="mt-4 text-xs text-faint">
        Total Sales = Cash Collected (Delivered) + Payment to Receive (open
        orders); it excludes cancelled, returned and refunded orders. Open orders
        = Pending + Confirmed + Packed + Shipped. Closing stock is current
        on-hand inventory. Full profit numbers are on the Finance page.
      </p>
    </div>
  );
}
