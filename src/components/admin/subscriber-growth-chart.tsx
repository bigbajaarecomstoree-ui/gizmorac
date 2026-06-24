import { TrendingUp } from "lucide-react";
import type { GrowthPoint } from "@/lib/data/subscribers";

const W = 720;
const H = 160;
const PAD = { l: 6, r: 6, t: 10, b: 22 };

/** Daily new-subscriber bars over the period (read-only SVG). */
export function SubscriberGrowthChart({ points }: { points: GrowthPoint[] }) {
  const n = points.length || 1;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((s, p) => s + p.count, 0);
  const slot = plotW / n;
  const bw = Math.min(slot * 0.6, 18);
  const cx = (i: number) => PAD.l + (i + 0.5) * slot;

  const ticks = points.length
    ? [0, Math.floor(n / 2), n - 1].filter((v, idx, a) => a.indexOf(v) === idx)
    : [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp size={15} className="text-accent" /> Growth · last {n} days
        </h2>
        <span className="text-xs text-muted">
          <span className="font-semibold text-foreground">+{total}</span> new
        </span>
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label="Subscriber growth">
          <line x1={PAD.l} y1={PAD.t + plotH} x2={W - PAD.r} y2={PAD.t + plotH} stroke="currentColor" className="text-border" strokeWidth={1} />
          {points.map((p, i) =>
            p.count > 0 ? (
              <rect
                key={p.date}
                x={cx(i) - bw / 2}
                y={PAD.t + plotH - (p.count / max) * plotH}
                width={bw}
                height={(p.count / max) * plotH}
                rx={2}
                fill="#f59e0b"
              />
            ) : null,
          )}
          {ticks.map((i) => (
            <text
              key={i}
              x={cx(i)}
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
