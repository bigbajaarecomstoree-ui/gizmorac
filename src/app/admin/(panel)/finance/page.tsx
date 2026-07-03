import Link from "next/link";
import {
  Wallet,
  IndianRupee,
  TrendingUp,
  Percent,
  PackageX,
  AlertTriangle,
  Undo2,
  RotateCcw,
  Receipt,
  Trophy,
} from "lucide-react";
import {
  getReportSummary,
  getReportSummaryBetween,
  getFinanceTrend,
} from "@/lib/data/orders";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FinanceFees } from "@/components/admin/finance-fees";
import { FinanceTrendChart } from "@/components/admin/finance-trend-chart";
import { DateRangeBar, parseDateRange } from "@/components/admin/date-range-bar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { custom, range, rangeLabel } = parseDateRange(sp);

  const r = custom
    ? await getReportSummaryBetween(sp.from, sp.to)
    : await getReportSummary(range);

  const noCosts = r.revenue > 0 && r.cogs === 0;
  const trend = await getFinanceTrend(30);

  const kpis = [
    { label: "Gross Sales", value: formatINR(r.grossSales), icon: IndianRupee, small: false },
    { label: "Net Sales", value: formatINR(r.revenue), icon: IndianRupee, accent: true, small: false },
    { label: "Cost of Goods", value: formatINR(r.cogs), icon: PackageX, small: false },
    { label: "Gross Profit", value: formatINR(r.grossProfit), icon: TrendingUp, accent: true, small: false },
    { label: "Margin", value: noCosts ? "Awaiting COGS" : `${r.margin}%`, icon: Percent, small: noCosts },
  ];

  const rates = [
    { label: "Refund rate", value: `${r.refundRate}%`, icon: Undo2, warn: r.refundRate > 10 },
    { label: "Return rate", value: `${r.returnRate}%`, icon: RotateCcw, warn: r.returnRate > 10 },
    { label: "Avg order value", value: formatINR(r.avgOrderValue), icon: TrendingUp, warn: false },
    { label: "Orders", value: String(r.orders), icon: Receipt, warn: false },
  ];

  // P&L waterfall rows (label, amount, kind, tone for colour).
  type Tone = "loss" | "refund" | "profit" | "cost";
  const lines: { label: string; amount: number; kind: "add" | "less" | "subtotal" | "total"; tone?: Tone }[] = [
    { label: "Gross Sales", amount: r.grossSales, kind: "add" },
    { label: "Less: Returned orders", amount: r.returned, kind: "less", tone: "loss" },
    { label: "Less: Refunded orders", amount: r.refunded, kind: "less", tone: "refund" },
    { label: "Net Sales", amount: r.revenue, kind: "subtotal" },
    { label: "Less: Cost of goods sold", amount: r.cogs, kind: "less", tone: "cost" },
    { label: "Gross Profit", amount: r.grossProfit, kind: "subtotal", tone: "profit" },
    { label: "Less: Outbound shipping", amount: r.shipping, kind: "less", tone: "cost" },
    { label: `Less: Payment gateway fees (${r.feePaymentPct}%)`, amount: r.gatewayFees, kind: "less", tone: "cost" },
    {
      label: `Less: COD fees${r.feeCodPct || r.feeCodFlat ? ` (${r.feeCodPct}% + ₹${r.feeCodFlat})` : ""}`,
      amount: r.codFees,
      kind: "less",
      tone: "cost",
    },
    { label: "Operating Profit", amount: r.operatingProfit, kind: "total", tone: "profit" },
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

      {/* preset range chips + custom date range */}
      <DateRangeBar
        basePath="/admin/finance"
        defaultRange="30d"
        range={range}
        custom={custom}
        from={sp.from}
        to={sp.to}
        split
      />

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
              className={cn(
                "mt-3 font-bold tracking-tight",
                k.small ? "text-sm text-muted" : "text-xl",
                k.label === "Gross Profit" && r.grossProfit < 0 ? "text-danger" : "",
              )}
            >
              {k.value}
            </div>
            <div className="tech-label mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* rates + order metrics */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rates.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <k.icon size={18} className={k.warn ? "text-amber-600" : "text-faint"} />
            <div className={cn("mt-3 text-xl font-bold tracking-tight", k.warn ? "text-amber-600" : "")}>
              {k.value}
            </div>
            <div className="tech-label mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* trend chart */}
      <div className="mt-6">
        <FinanceTrendChart points={trend} />
      </div>

      {/* P&L statement */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          Profit &amp; Loss statement
        </h2>
        <div className="divide-y divide-border">
          {lines.map((l) => {
            const isTotal = l.kind === "total" || l.kind === "subtotal";
            const amountColor =
              l.kind === "less"
                ? l.tone === "refund"
                  ? "text-amber-600"
                  : l.tone === "loss"
                    ? "text-red-600"
                    : "text-muted"
                : l.tone === "profit"
                  ? l.amount >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                  : "";
            return (
              <div
                key={l.label}
                className={cn(
                  "flex items-center justify-between px-5 py-3",
                  l.kind === "total" ? "bg-surface-2/60" : l.kind === "subtotal" ? "bg-surface-2/30" : "",
                  isTotal ? "font-semibold" : "",
                )}
              >
                <span className={l.kind === "less" ? "text-muted" : ""}>{l.label}</span>
                <span className={cn("tabular-nums", amountColor, isTotal ? "font-bold" : "")}>
                  {l.kind === "less" ? "−" : ""}
                  {formatINR(l.amount)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-5 py-3 text-sm text-muted">
            <span>Gross margin</span>
            <span className="tabular-nums font-semibold text-foreground">
              {noCosts ? "Awaiting COGS" : `${r.margin}%`}
            </span>
          </div>
        </div>
      </div>

      {/* editable operating-cost assumptions */}
      <div className="mt-3">
        <FinanceFees paymentPct={r.feePaymentPct} codPct={r.feeCodPct} codFlat={r.feeCodFlat} />
      </div>

      {/* profit by product */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 font-semibold">
          <Trophy size={16} className="text-accent" /> Profit by product
        </h2>
        {r.byProduct.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No sales in this period.</p>
        ) : (
          <>
            <div className="hidden items-center gap-3 border-b border-border px-5 py-2 text-xs uppercase tracking-wider text-faint sm:flex">
              <span className="flex-1">Product</span>
              <span className="w-20 text-right">Sales</span>
              <span className="w-20 text-right">Profit</span>
              <span className="w-12 text-right">Margin</span>
            </div>
            <div className="divide-y divide-border">
              {r.byProduct.map((p) => {
                const m = p.sales > 0 ? Math.round((p.profit / p.sales) * 100) : 0;
                const mc =
                  noCosts || p.profit <= 0
                    ? "text-muted"
                    : m < 10
                      ? "text-red-600"
                      : m < 20
                        ? "text-amber-600"
                        : "text-emerald-600";
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {p.name.replace(/^GIZMORAC\s+/i, "")}
                      <span className="ml-1.5 text-xs text-faint">×{p.units}</span>
                    </span>
                    <span className="readout w-20 text-right font-semibold">{formatINR(p.sales)}</span>
                    <span className={cn("readout w-20 text-right font-semibold", mc)}>
                      {noCosts ? "—" : formatINR(p.profit)}
                    </span>
                    <span className={cn("w-12 text-right text-xs font-semibold", mc)}>
                      {noCosts ? "—" : `${m}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-faint">
        Cancelled orders are not counted as sales at all. Gross Sales = real
        orders placed; less returns &amp; refunds = Net Sales. Gross Profit = Net
        Sales − Cost of Goods Sold, before operating expenses (outbound shipping,
        ads, payment/COD fees, salaries). COGS uses each product&apos;s cost
        price and includes the cost of any free replacement units shipped in the
        period. Returns/refunds are deducted via the Returned/Refunded statuses
        on the order.
      </p>
    </div>
  );
}
