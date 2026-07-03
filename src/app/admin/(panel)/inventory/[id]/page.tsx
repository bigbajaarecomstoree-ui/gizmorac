import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Boxes,
  IndianRupee,
  Gauge,
  CalendarClock,
  AlertTriangle,
  History,
} from "lucide-react";
import type { InventoryTxnType } from "@prisma/client";
import {
  getProductInventory,
  getStockMovements,
  getVelocity,
} from "@/lib/data/inventory";
import { formatINR } from "@/lib/format";
import { EditorCard } from "@/components/admin/editor-card";
import { saveInventoryNote, saveSupplier } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const MOVEMENT_LABEL: Record<InventoryTxnType, string> = {
  SALE: "Sale",
  RESTOCK_QC_PASS: "Restock · QC pass",
  DAMAGE_QC_FAIL: "Damaged · QC fail",
  REPLACEMENT_DISPATCH: "Replacement dispatch",
  RTO_RESTOCK: "RTO restock",
  CANCEL_RESTOCK: "Cancelled · restock",
  MANUAL_ADJUST: "Manual adjustment",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default async function InventoryDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getProductInventory(id);
  if (!product) notFound();

  const [movements, velocity] = await Promise.all([
    getStockMovements(id),
    getVelocity(id, product.stock, product.lowStockThreshold),
  ]);

  const out = product.stock === 0;
  const low = !out && product.stock <= product.lowStockThreshold;
  const statusLabel = out ? "Out of stock" : low ? "Low" : "Healthy";
  const statusColor = out
    ? "bg-red-500/15 text-red-600"
    : low
      ? "bg-amber-500/15 text-amber-600"
      : "bg-emerald-500/15 text-emerald-600";
  const stockValue = product.cost * product.stock;
  const perDayLabel = velocity.perDay.toFixed(velocity.perDay < 1 ? 2 : 1);

  const stats = [
    { label: "On hand", value: `${product.stock} pcs`, icon: Boxes },
    { label: "Low at", value: `${product.lowStockThreshold} pcs`, icon: AlertTriangle },
    { label: "Stock value", value: formatINR(stockValue), icon: IndianRupee, accent: true },
    {
      label: "Sales velocity",
      value: velocity.perDay > 0 ? `${perDayLabel}/day` : "—",
      icon: Gauge,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to inventory
      </Link>

      {/* header */}
      <div className="mt-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package size={24} className="text-faint" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight">{product.name}</h1>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", statusColor)}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-faint">{product.sku}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-faint">
              <CalendarClock size={12} /> Updated {relative(product.updatedAt)} · Admin
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="tech-label flex items-center gap-1.5">
                <s.icon size={12} /> {s.label}
              </div>
              <div className={cn("mt-0.5 text-lg font-bold", s.accent ? "readout text-accent" : "")}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* reorder recommendation */}
      {velocity.reorder ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-700">Reorder recommended</p>
            <p className="mt-0.5 text-muted">
              {velocity.daysRemaining !== null
                ? `At ${perDayLabel}/day, about ${velocity.daysRemaining} day${velocity.daysRemaining === 1 ? "" : "s"} of stock left.`
                : `Stock (${product.stock}) is at or below the low-stock threshold (${product.lowStockThreshold}).`}
              {product.supplier ? ` Supplier: ${product.supplier}.` : ""}
            </p>
          </div>
        </div>
      ) : velocity.daysRemaining !== null ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <span className="font-semibold text-foreground">~{velocity.daysRemaining} days</span> of
          stock left at {perDayLabel}/day ({velocity.unitsSold} sold in the last{" "}
          {velocity.windowDays} days).
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EditorCard
          icon="truck"
          title="Supplier"
          hint="Where you reorder this product from."
          placeholder="e.g. ABC Electronics"
          saveLabel="Save"
          id={product.id}
          initial={product.supplier}
          action={saveSupplier}
        />
        <EditorCard
          icon="note"
          title="Inventory notes"
          hint="Private to staff — reorder reminders, supplier delays…"
          placeholder="e.g. Supplier delayed · next shipment Monday"
          saveLabel="Save note"
          rows={3}
          id={product.id}
          initial={product.inventoryNote}
          action={saveInventoryNote}
        />
      </div>

      {/* movement history */}
      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-3 font-semibold">
          <History size={16} className="text-accent" /> Stock movement history
          <span className="ml-auto text-xs font-normal text-faint">{movements.length} recorded</span>
        </h2>
        {movements.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">
            No stock movements yet. Sales, restocks and manual edits will appear here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {movements.map((m) => {
              const up = m.delta >= 0;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                      up ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600",
                    )}
                  >
                    {up ? "+" : "−"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{MOVEMENT_LABEL[m.type]}</div>
                    <div className="text-xs text-faint" title={when(m.createdAt)}>
                      {relative(m.createdAt)}
                      {m.reason ? ` · ${m.reason}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={cn("text-sm font-semibold", up ? "text-emerald-600" : "text-red-600")}>
                      {up ? "+" : "−"}
                      {Math.abs(m.delta)}
                    </div>
                    <div className="text-xs text-faint">→ {m.stockAfter}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
