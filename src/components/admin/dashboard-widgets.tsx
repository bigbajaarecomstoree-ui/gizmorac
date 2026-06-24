import Link from "next/link";
import {
  TriangleAlert,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  History,
  Activity,
  CheckCircle2,
  UserPlus,
  Repeat,
  ShieldAlert,
} from "lucide-react";
import type { InventoryTxnType } from "@prisma/client";
import type { LowStockItem, RecentMovement } from "@/lib/data/inventory";
import type { BestSeller, RevenueTrend, RefundStats } from "@/lib/data/dashboard";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const short = (name: string) => name.replace(/^GIZMORAC\s+/i, "").replace(/^Gizmorac\s+/i, "");

const MOVE_LABEL: Record<InventoryTxnType, string> = {
  SALE: "Sale",
  RESTOCK_QC_PASS: "Restock",
  DAMAGE_QC_FAIL: "Damaged",
  REPLACEMENT_DISPATCH: "Replacement",
  RTO_RESTOCK: "RTO restock",
  CANCEL_RESTOCK: "Restock",
  MANUAL_ADJUST: "Manual",
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const cardCls = "rounded-xl border border-border bg-surface";

/** ⚠ Low Stock — the actual items running low, linking into Inventory. */
export function LowStockWidget({ items }: { items: LowStockItem[] }) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <TriangleAlert size={15} className="text-amber-600" /> Low stock
        </h2>
        <Link href="/admin/inventory?status=low" className="inline-flex items-center gap-1 text-xs font-medium text-accent-bright hover:text-accent">
          View all <ArrowRight size={13} />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted">
          <CheckCircle2 size={15} className="text-emerald-600" /> Everything is well stocked.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((it) => {
            const out = it.stock === 0;
            return (
              <Link key={it.id} href={`/admin/inventory/${it.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2">
                <span className="truncate text-sm">{short(it.name)}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", out ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-600")}>
                  {it.stock} left
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Recent inventory changes — the live ledger feed. */
export function RecentMovementsWidget({ movements }: { movements: RecentMovement[] }) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History size={15} className="text-accent" /> Recent inventory changes
        </h2>
        <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-xs font-medium text-accent-bright hover:text-accent">
          Inventory <ArrowRight size={13} />
        </Link>
      </div>
      {movements.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No stock changes recorded yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {movements.map((m) => {
            const up = m.delta >= 0;
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={cn("w-10 shrink-0 text-right text-sm font-bold tabular-nums", up ? "text-emerald-600" : "text-red-600")}>
                  {up ? "+" : "−"}
                  {Math.abs(m.delta)}
                </span>
                <span className="truncate text-sm">{short(m.productName)}</span>
                <span className="ml-auto shrink-0 text-xs text-faint">
                  {MOVE_LABEL[m.type]} · {ago(m.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 🏆 Best seller by revenue. */
export function BestSellerCard({ best }: { best: BestSeller | null }) {
  return (
    <Link
      href="/admin/reports"
      className="group flex flex-col justify-between rounded-xl border border-accent/30 bg-accent-soft/40 p-5 transition-colors hover:border-accent/60 hover:bg-accent-soft"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Trophy size={16} className="text-accent" /> Best seller
      </h2>
      {best ? (
        <div className="mt-3">
          <div className="line-clamp-2 text-base font-bold leading-snug">{short(best.name)}</div>
          <div className="readout mt-1 text-lg font-bold text-accent">{formatINR(best.revenue)}</div>
          <div className="tech-label mt-0.5">{best.units} sold</div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No sales yet.</p>
      )}
    </Link>
  );
}

/** Customer breakdown: New · Repeat · High-risk. */
export function CustomerSegmentsCard({
  newCount,
  repeat,
  highRisk,
}: {
  newCount: number;
  repeat: number;
  highRisk: number;
}) {
  const cells = [
    { label: "New (30d)", value: newCount, icon: UserPlus, color: "text-emerald-600" },
    { label: "Repeat", value: repeat, icon: Repeat, color: "text-accent" },
    { label: "High risk", value: highRisk, icon: ShieldAlert, color: highRisk > 0 ? "text-red-600" : "text-faint" },
  ];
  return (
    <Link href="/admin/customers" className="group block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/50">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">Customers</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg bg-surface-2 px-2 py-2.5">
            <c.icon size={15} className={cn("mx-auto", c.color)} />
            <div className="mt-1.5 text-lg font-bold tabular-nums">{c.value}</div>
            <div className="tech-label">{c.label}</div>
          </div>
        ))}
      </div>
    </Link>
  );
}

/** Store health: revenue trend, low stock, pending, refund rate. */
export function StoreHealthCard({
  trend,
  lowStock,
  pending,
  refunds,
}: {
  trend: RevenueTrend;
  lowStock: number;
  pending: number;
  refunds: RefundStats;
}) {
  const rows = [
    {
      label: "Revenue (MoM)",
      value:
        trend.pct === null ? "—" : `${trend.pct >= 0 ? "+" : ""}${trend.pct}%`,
      good: trend.pct === null ? null : trend.pct >= 0,
      icon: trend.pct !== null && trend.pct < 0 ? ArrowDownRight : ArrowUpRight,
    },
    {
      label: "Low stock",
      value: lowStock === 0 ? "All stocked" : `${lowStock} item${lowStock === 1 ? "" : "s"}`,
      good: lowStock === 0,
    },
    {
      label: "Pending orders",
      value: pending === 0 ? "None waiting" : `${pending} to act`,
      good: pending === 0,
    },
    {
      label: "Refund rate",
      value: `${refunds.rate}%`,
      good: refunds.rate <= 10,
    },
  ];
  return (
    <div className={cn(cardCls, "p-5")}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Activity size={16} className="text-accent" /> Store health
      </h2>
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <dt className="text-muted">{r.label}</dt>
            <dd
              className={cn(
                "flex items-center gap-1 font-semibold",
                r.good === null ? "text-muted" : r.good ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {r.icon ? <r.icon size={14} /> : r.good ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
