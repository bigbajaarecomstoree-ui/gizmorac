import Link from "next/link";
import {
  BarChart3,
  Download,
  Receipt,
  IndianRupee,
  Boxes,
  TrendingUp,
} from "lucide-react";
import {
  getReportSummary,
  DATE_RANGES,
  type DateRange,
} from "@/lib/data/orders";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string }>;

const HIGHLIGHT = ["Cancelled", "Returned", "Refunded"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const range: DateRange = DATE_RANGES.some((r) => r.value === sp.range)
    ? (sp.range as DateRange)
    : "30d";

  const report = await getReportSummary(range);
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label ?? "";

  const kpis = [
    { label: "Orders", value: String(report.orders), icon: Receipt },
    { label: "Net revenue", value: formatINR(report.revenue), icon: IndianRupee, accent: true },
    { label: "Units sold", value: String(report.units), icon: Boxes },
    { label: "Avg order value", value: formatINR(report.avgOrderValue), icon: TrendingUp },
  ];

  const maxCount = Math.max(1, ...report.byStatus.map((s) => s.count));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Sales and order performance · {rangeLabel}
          </p>
        </div>
        <a
          href={`/api/admin/orders/export?range=${range}`}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          download
        >
          <Download size={16} /> Export orders
        </a>
      </div>

      {/* range chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {DATE_RANGES.map((r) => (
          <Link
            key={r.value}
            href={`/admin/reports?range=${r.value}`}
            className={
              r.value === range
                ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
                : "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            }
          >
            {r.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <k.icon size={18} className={k.accent ? "text-accent" : "text-faint"} />
            <div className="mt-3 text-xl font-bold tracking-tight">{k.value}</div>
            <div className="tech-label mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* status breakdown */}
      <div className="mt-8 rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          Orders by status
        </h2>
        <div className="divide-y divide-border">
          {report.byStatus.map((s) => (
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
        {report.orders === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted">
            No orders in this period.
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-faint">
        Net revenue and units exclude cancelled, returned and refunded orders.
      </p>
    </div>
  );
}
