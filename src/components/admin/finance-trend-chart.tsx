import { TrendingUp } from "lucide-react";
import type { FinanceTrendPoint } from "@/lib/data/orders";
import { formatINR } from "@/lib/format";

const SERIES = [
  { key: "revenue", label: "Revenue", color: "#f59e0b" },
  { key: "profit", label: "Profit", color: "#10b981" },
  { key: "refunds", label: "Refunds", color: "#ef4444" },
] as const;

const W = 720;
const H = 200;
const PAD = { l: 6, r: 6, t: 8, b: 22 };

/** Daily Revenue / Profit / Refunds over the period (read-only SVG). */
export function FinanceTrendChart({ points }: { points: FinanceTrendPoint[] }) {
  const n = points.length;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const max = Math.max(
    1,
    ...points.map((p) => Math.max(p.revenue, Math.max(0, p.profit), p.refunds)),
  );
  const x = (i: number) => PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.t + plotH - (Math.max(0, v) / max) * plotH;

  const line = (key: (typeof SERIES)[number]["key"]) =>
    points.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  const totals = {
    revenue: points.reduce((s, p) => s + p.revenue, 0),
    profit: points.reduce((s, p) => s + p.profit, 0),
    refunds: points.reduce((s, p) => s + p.refunds, 0),
  };

  // ~5 evenly spaced x labels.
  const ticks = n
    ? [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1].filter(
        (v, idx, a) => a.indexOf(v) === idx,
      )
    : [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp size={15} className="text-accent" /> Trend · last {n} days
        </h2>
        <div className="flex flex-wrap gap-3 text-xs">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-muted">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}{" "}
              <span className="font-semibold text-foreground">{formatINR(totals[s.key])}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="Finance trend">
          {/* baseline */}
          <line x1={PAD.l} y1={PAD.t + plotH} x2={W - PAD.r} y2={PAD.t + plotH} stroke="currentColor" className="text-border" strokeWidth={1} />
          {/* revenue area */}
          <polygon
            points={`${x(0).toFixed(1)},${(PAD.t + plotH).toFixed(1)} ${line("revenue")} ${x(n - 1).toFixed(1)},${(PAD.t + plotH).toFixed(1)}`}
            fill="#f59e0b"
            opacity={0.08}
          />
          {SERIES.map((s) => (
            <polyline
              key={s.key}
              points={line(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              className="fill-faint"
              fontSize={11}
            >
              {points[i]?.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
