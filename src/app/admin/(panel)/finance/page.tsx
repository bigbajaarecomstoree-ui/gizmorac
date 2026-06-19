import Link from "next/link";
import {
  Wallet,
  IndianRupee,
  TrendingUp,
  Percent,
  PackageX,
  AlertTriangle,
} from "lucide-react";
import {
  getReportSummary,
  getReportSummaryBetween,
  DATE_RANGES,
  type DateRange,
} from "@/lib/data/orders";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

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

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const custom = Boolean(sp.from && sp.to && YMD.test(sp.from) && YMD.test(sp.to));
  const range: DateRange = DATE_RANGES.some((r) => r.value === sp.range)
    ? (sp.range as DateRange)
    : "30d";

  const r = custom
    ? await getReportSummaryBetween(sp.from, sp.to)
    : await getReportSummary(range);

  const rangeLabel = custom
    ? `${fmtYMD(sp.from)} – ${fmtYMD(sp.to)}`
    : (DATE_RANGES.find((x) => x.value === range)?.label ?? "");

  const todayYMD = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const noCosts = r.revenue > 0 && r.cogs === 0;

  const kpis = [
    { label: "Gross Sales", value: formatINR(r.grossSales), icon: IndianRupee },
    { label: "Net Sales", value: formatINR(r.revenue), icon: IndianRupee, accent: true },
    { label: "Cost of Goods", value: formatINR(r.cogs), icon: PackageX },
    { label: "Gross Profit", value: formatINR(r.grossProfit), icon: TrendingUp, accent: true },
    { label: "Margin", value: `${r.margin}%`, icon: Percent },
  ];

  // P&L waterfall rows (label, amount, sign).
  const lines: { label: string; amount: number; kind: "add" | "less" | "total" }[] = [
    { label: "Gross Sales", amount: r.grossSales, kind: "add" },
    { label: "Less: Returned orders", amount: r.returned, kind: "less" },
    { label: "Less: Refunded orders", amount: r.refunded, kind: "less" },
    { label: "Net Sales", amount: r.revenue, kind: "total" },
    { label: "Less: Cost of goods sold", amount: r.cogs, kind: "less" },
    { label: "Gross Profit", amount: r.grossProfit, kind: "total" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <Wallet size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Profit &amp; Loss</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Calculated from orders · {rangeLabel}
      </p>

      {/* preset range chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {DATE_RANGES.map((x) => (
          <Link
            key={x.value}
            href={`/admin/finance?range=${x.value}`}
            className={
              !custom && x.value === range
                ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
                : "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            }
          >
            {x.label}
          </Link>
        ))}
      </div>

      {/* custom date range */}
      <form
        method="get"
        action="/admin/finance"
        className={`mt-3 flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-3 ${
          custom ? "border-accent" : "border-border"
        }`}
      >
        <label className="flex flex-col gap-1">
          <span className="tech-label">From</span>
          <input type="date" name="from" defaultValue={custom ? sp.from : ""} max={todayYMD} required className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="tech-label">To</span>
          <input type="date" name="to" defaultValue={custom ? sp.to : ""} max={todayYMD} required className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none" />
        </label>
        <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover">
          Apply range
        </button>
        {custom ? (
          <Link href="/admin/finance?range=30d" className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-foreground">
            Reset
          </Link>
        ) : null}
      </form>

      {noCosts ? (
        <Link
          href="/admin/products"
          className="mt-4 flex items-start gap-2 rounded-xl border border-accent-dim/50 bg-accent-soft px-4 py-3 text-sm transition-colors hover:border-accent"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-bright" />
          <span>
            <span className="font-semibold text-accent-bright">
              Set cost prices to see real profit.
            </span>{" "}
            Your products have no cost yet, so profit currently equals net sales.
            Add each product&apos;s purchase cost (Products → edit) → accurate
            COGS &amp; margin appear here.
          </span>
        </Link>
      ) : null}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <k.icon size={18} className={k.accent ? "text-accent" : "text-faint"} />
            <div
              className={`mt-3 text-xl font-bold tracking-tight ${
                k.label === "Gross Profit" && r.grossProfit < 0 ? "text-danger" : ""
              }`}
            >
              {k.value}
            </div>
            <div className="tech-label mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* P&L statement */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          Profit &amp; Loss statement
        </h2>
        <div className="divide-y divide-border">
          {lines.map((l) => (
            <div
              key={l.label}
              className={`flex items-center justify-between px-5 py-3 ${
                l.kind === "total" ? "bg-surface-2/60 font-semibold" : ""
              }`}
            >
              <span className={l.kind === "less" ? "text-muted" : ""}>
                {l.label}
              </span>
              <span
                className={`tabular-nums ${
                  l.kind === "less"
                    ? "text-danger"
                    : l.kind === "total"
                      ? "font-bold"
                      : ""
                }`}
              >
                {l.kind === "less" ? "−" : ""}
                {formatINR(l.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 text-sm text-muted">
            <span>Gross margin</span>
            <span className="tabular-nums font-semibold text-foreground">
              {r.margin}%
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-faint">
        Cancelled orders are not counted as sales at all. Gross Sales = real
        orders placed; less returns &amp; refunds = Net Sales. Gross Profit = Net
        Sales − Cost of Goods Sold, before operating expenses (outbound shipping,
        ads, payment/COD fees, salaries). COGS uses each product&apos;s cost
        price. Returns/replacements are deducted via the Returned/Refunded
        statuses on the order.
      </p>
    </div>
  );
}
