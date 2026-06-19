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
  TrendingUp,
} from "lucide-react";
import {
  getReportSummary,
  getReportSummaryBetween,
  DATE_RANGES,
  type DateRange,
} from "@/lib/data/orders";
import { getClosingStock } from "@/lib/data/queries";
import { formatINR, formatCount } from "@/lib/format";
import { INDIA_STATES } from "@/lib/india-states";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

const HIGHLIGHT = ["Cancelled", "Returned", "Refunded"];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function fmtYMD(ymd?: string): string {
  if (!ymd || !YMD.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const custom = Boolean(sp.from && sp.to && YMD.test(sp.from) && YMD.test(sp.to));
  const range: DateRange = DATE_RANGES.some((r) => r.value === sp.range)
    ? (sp.range as DateRange)
    : "30d";

  const [report, stock] = await Promise.all([
    custom ? getReportSummaryBetween(sp.from, sp.to) : getReportSummary(range),
    getClosingStock(),
  ]);

  const rangeLabel = custom
    ? `${fmtYMD(sp.from)} – ${fmtYMD(sp.to)}`
    : (DATE_RANGES.find((r) => r.value === range)?.label ?? "");

  const exportHref = custom
    ? `/api/admin/orders/export?from=${sp.from}&to=${sp.to}`
    : `/api/admin/orders/export?range=${range}`;

  // IST "today" so the date pickers can't pick a future day.
  const todayYMD = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const kpis = [
    { label: "Total Sales", value: formatINR(report.revenue), icon: IndianRupee, accent: true },
    { label: "Cash Collected", value: formatINR(report.collected), sub: "Delivered (COD)", icon: Wallet },
    { label: "Payment to Receive", value: formatINR(report.toReceive), sub: "Open orders", icon: HandCoins },
    { label: "Total Orders", value: String(report.orders), icon: Receipt },
    { label: "Pending Orders", value: String(report.pending), icon: Clock },
    { label: "Open Orders", value: String(report.open), icon: Truck },
    {
      label: "Gross Profit",
      value: formatINR(report.grossProfit),
      sub: `${report.margin}% margin`,
      icon: TrendingUp,
      accent: true,
    },
    {
      label: "Closing Stock",
      value: `${formatCount(stock.units)} units`,
      sub: `${formatINR(stock.value)} · ${stock.skus} SKUs`,
      icon: Boxes,
    },
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
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          download
        >
          <Download size={16} /> Export orders
        </a>
      </div>

      {/* preset range chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {DATE_RANGES.map((r) => (
          <Link
            key={r.value}
            href={`/admin/reports?range=${r.value}`}
            className={
              !custom && r.value === range
                ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
                : "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            }
          >
            {r.label}
          </Link>
        ))}
      </div>

      {/* custom date range */}
      <form
        method="get"
        action="/admin/reports"
        className={`mt-3 flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-3 ${
          custom ? "border-accent" : "border-border"
        }`}
      >
        <label className="flex flex-col gap-1">
          <span className="tech-label">From</span>
          <input
            type="date"
            name="from"
            defaultValue={custom ? sp.from : ""}
            max={todayYMD}
            required
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="tech-label">To</span>
          <input
            type="date"
            name="to"
            defaultValue={custom ? sp.to : ""}
            max={todayYMD}
            required
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Apply range
        </button>
        {custom ? (
          <Link
            href="/admin/reports?range=30d"
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-foreground"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <k.icon size={18} className={k.accent ? "text-accent" : "text-faint"} />
            <div className="mt-3 text-xl font-bold tracking-tight">{k.value}</div>
            <div className="tech-label mt-1">{k.label}</div>
            {k.sub ? <div className="mt-1 text-xs text-faint">{k.sub}</div> : null}
          </div>
        ))}
      </div>

      {/* profit & loss link */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="text-muted">
          Net Sales {formatINR(report.revenue)} · COGS {formatINR(report.cogs)} ·
          Gross Profit{" "}
          <span className="font-semibold text-foreground">
            {formatINR(report.grossProfit)}
          </span>
        </span>
        <Link
          href={
            custom
              ? `/admin/finance?from=${sp.from}&to=${sp.to}`
              : `/admin/finance?range=${range}`
          }
          className="font-medium text-accent transition-colors hover:text-accent-bright"
        >
          Full Profit &amp; Loss →
        </Link>
      </div>

      {/* GST filing export */}
      <form
        method="get"
        action="/api/admin/reports/gst"
        className="mt-6 rounded-xl border border-border bg-surface p-5"
      >
        <div className="flex items-center gap-2">
          <Download size={18} className="text-accent" />
          <h2 className="font-semibold">GST filing export</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Line-item sales with HSN, taxable value & CGST/SGST/IGST for the
          selected date range — using each product&apos;s own GST rate. Ready to
          hand to your accountant for GSTR-1.
        </p>

        {custom ? (
          <>
            <input type="hidden" name="from" value={sp.from} />
            <input type="hidden" name="to" value={sp.to} />
          </>
        ) : (
          <input type="hidden" name="range" value={range} />
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="tech-label">Your registered state</span>
            <select
              name="sellerState"
              required
              defaultValue=""
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                Select state…
              </option>
              {INDIA_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Download size={16} /> Download GST CSV
          </button>
        </div>
        <p className="mt-3 text-xs text-faint">
          Prices are GST-inclusive; taxable value is back-calculated using each
          product&apos;s HSN &amp; GST rate (set per product). Intra-state orders
          (same as your state) split into CGST+SGST, others as IGST. Set HSN/rate
          on products for accurate filing.
        </p>
      </form>

      {/* status breakdown */}
      <div className="mt-8 rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          Orders by status
        </h2>
        {report.orders === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
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

      <p className="mt-4 text-xs text-faint">
        Total Sales excludes cancelled, returned and refunded orders, and equals
        Cash Collected (Delivered) + Payment to Receive (open orders). Open
        orders = Pending + Confirmed + Packed + Shipped. Closing stock is current
        on-hand inventory (no historical snapshots).
      </p>
    </div>
  );
}
