"use client";

import * as React from "react";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import type {
  ChartMetric,
  ChartRange,
  DashboardChart,
} from "@/lib/data/dashboard-chart";
import { cn } from "@/lib/utils";

const METRICS: { value: ChartMetric; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
];
const RANGES: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
];
const PREV_LABEL: Record<ChartRange, string> = {
  "7d": "prev 7 days",
  "30d": "prev 30 days",
  week: "last week",
  month: "last month",
  "12m": "prev year",
  ytd: "prev year",
};

// --- number formatting --------------------------------------------------
function round(x: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}
/** Compact Indian money: 412600 -> "4.126L", 40000 -> "40k". */
function compactINR(n: number, dp = 3): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `${round(n / 1e7, dp)}Cr`;
  if (a >= 1e5) return `${round(n / 1e5, dp)}L`;
  if (a >= 1e3) return `${round(n / 1e3, dp)}k`;
  return String(Math.round(n));
}
const enIN = new Intl.NumberFormat("en-IN");

// --- y-axis "nice" scale ------------------------------------------------
function niceScale(rawMax: number, integer: boolean): { max: number; ticks: number[] } {
  if (rawMax <= 0) {
    return integer
      ? { max: 4, ticks: [0, 1, 2, 3, 4] }
      : { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  }
  const target = rawMax / 4; // aim for ~4 intervals
  const pow = 10 ** Math.floor(Math.log10(target));
  const norm = target / pow;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  let step = niceNorm * pow;
  if (integer) step = Math.max(1, Math.ceil(step));
  let max = Math.ceil(rawMax / step) * step;
  if (integer) max = Math.max(max, 4);
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 1000; v += step) ticks.push(round(v, 6));
  return { max, ticks };
}

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  align = "left",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-2 cursor-pointer"
      >
        {current?.label}
        <ChevronDown
          size={16}
          className={cn("text-faint transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute z-20 mt-1 min-w-[12rem] rounded-xl border border-border bg-surface p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 cursor-pointer",
                o.value === value ? "font-semibold text-accent-bright" : "text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Delta({ cur, prev, label }: { cur: number; prev: number | null; label: string }) {
  if (prev == null || prev <= 0) {
    return (
      <div>
        <div className="text-sm font-semibold text-faint">—%</div>
        <div className="tech-label mt-0.5">vs {label}</div>
      </div>
    );
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-0.5 text-sm font-semibold",
          up ? "text-success" : "text-danger",
        )}
      >
        {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        {Math.abs(pct)}%
      </div>
      <div className="tech-label mt-0.5">vs {label}</div>
    </div>
  );
}

export function SalesChart({ data }: { data: DashboardChart }) {
  const [metric, setMetric] = React.useState<ChartMetric>("revenue");
  const [range, setRange] = React.useState<ChartRange>("month");

  const series = data.ranges[range][metric];
  const isMoney = metric === "revenue";
  const rawMax = series.buckets.reduce((m, b) => Math.max(m, b.value), 0);
  const { max, ticks } = niceScale(rawMax, !isMoney);

  const fmtFull = (n: number) => (isMoney ? `₹${enIN.format(n)}` : `${enIN.format(n)}`);
  const fmtAxis = (n: number) => (isMoney ? compactINR(n, 1) : enIN.format(n));

  // Headline: full ₹ for everyday amounts; compact "X.XXL INR" once it hits lakhs.
  const moneyCompact = series.total >= 1e5;
  const headline = isMoney
    ? moneyCompact
      ? compactINR(series.total, 3)
      : `₹${enIN.format(series.total)}`
    : enIN.format(series.total);
  const headlineSuffix = isMoney
    ? moneyCompact
      ? "INR"
      : null
    : `order${series.total === 1 ? "" : "s"}`;

  const n = series.buckets.length;
  const labelEvery = series.granularity === "month" ? 1 : n <= 8 ? 1 : Math.ceil(n / 6);
  const showYoy = range === "7d" || range === "30d" || range === "week" || range === "month";

  const H = 240;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* controls */}
      <div className="-ml-2.5 flex flex-wrap items-center gap-2">
        <Dropdown value={metric} options={METRICS} onChange={setMetric} />
        <Dropdown value={range} options={RANGES} onChange={setRange} align="left" />
      </div>

      {/* headline + deltas */}
      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-3xl font-bold tracking-tight">
            {headline}
            {headlineSuffix ? (
              <span className="ml-1.5 text-base font-medium text-faint">{headlineSuffix}</span>
            ) : null}
          </div>
          <div className="tech-label mt-1">
            {RANGES.find((r) => r.value === range)?.label}
          </div>
        </div>
        <Delta cur={series.total} prev={series.prevTotal} label={PREV_LABEL[range]} />
        {showYoy ? (
          <Delta cur={series.total} prev={series.yoyTotal} label="last year" />
        ) : null}
      </div>

      {/* chart */}
      <div className="relative mt-6" style={{ height: H }}>
        {/* gridlines + y tick labels */}
        {ticks.map((tk) => {
          const top = `${(1 - tk / max) * 100}%`;
          return (
            <React.Fragment key={tk}>
              <div
                className="absolute right-0 left-12 border-t border-border/70"
                style={{ top }}
              />
              <div
                className="absolute left-0 w-10 -translate-y-1/2 text-right text-xs text-faint"
                style={{ top }}
              >
                {fmtAxis(tk)}
              </div>
            </React.Fragment>
          );
        })}

        {/* bars */}
        <div className="absolute inset-y-0 right-0 left-12 flex items-end gap-[3px]">
          {series.buckets.map((b, i) => (
            <div
              key={i}
              className="group relative flex h-full flex-1 items-end"
              title={b.future ? undefined : `${b.label}: ${fmtFull(b.value)}`}
            >
              {!b.future ? (
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-colors",
                    b.partial ? "bg-border-bright" : "bg-accent group-hover:bg-accent-hover",
                  )}
                  style={{
                    height: `${(b.value / max) * 100}%`,
                    minHeight: b.value > 0 ? 2 : 0,
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* x-axis labels */}
      <div className="mt-2 ml-12 flex gap-[3px]">
        {series.buckets.map((b, i) => (
          <div key={i} className="flex-1 text-center text-xs text-faint">
            {i % labelEvery === 0 ? b.label : " "}
          </div>
        ))}
      </div>

      <p className="mt-3 text-right text-xs text-faint">
        Updated {data.generatedAt} IST
      </p>
    </div>
  );
}
