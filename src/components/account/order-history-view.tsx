"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, LayoutGrid, Table2 } from "lucide-react";
import { OrderStatusBadge, RtoBadge } from "@/components/admin/order-status-badge";
import { ProductArt } from "@/components/product/product-art";
import { OrderActions } from "@/components/account/order-actions";
import { ShipmentProgress } from "@/components/account/shipment-progress";
import { formatINR } from "@/lib/format";
import type { DeviceArt, OrderStatus } from "@/lib/types";

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  rtoStatus: string;
  createdAt: string;
  paymentLabel: string; // "Prepaid" | "COD"
  total: number;
  address: string; // "City, State"
  itemsSummary: string;
  count: number;
  items: { id: string; qty: number; art: DeviceArt; image: string | null }[];
  canCancel: boolean;
  canDispute: boolean;
  canWarranty: boolean;
  trackLabel: string;
  /** Delivery stage 1–4 (Processing→Shipped→OFD→Delivered). */
  stage: number;
  /** Whether to show the shipment tracker (false for cancelled/returned). */
  showProgress: boolean;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const toggleBtn = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
    active ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"
  }`;

export function OrderHistoryView({ rows }: { rows: OrderRow[] }) {
  const [view, setView] = React.useState<"cards" | "table">("cards");
  const [q, setQ] = React.useState("");

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.orderNumber, r.status, r.itemsSummary, r.paymentLabel, r.address]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [rows, q]);

  return (
    <div className="mt-4">
      {/* toolbar: search + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search orders…"
            aria-label="Search orders"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="ml-auto inline-flex items-center rounded-lg border border-border bg-surface p-0.5">
          <button type="button" onClick={() => setView("cards")} className={toggleBtn(view === "cards")} aria-pressed={view === "cards"}>
            <LayoutGrid size={14} /> Cards
          </button>
          <button type="button" onClick={() => setView("table")} className={toggleBtn(view === "table")} aria-pressed={view === "table"}>
            <Table2 size={14} /> Table
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No orders match “{q}”.</p>
      ) : view === "cards" ? (
        <div className="mt-4 space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-bright">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                  <OrderStatusBadge status={o.status as OrderStatus} />
                  <RtoBadge rtoStatus={o.rtoStatus} customerFacing />
                </div>
                <span className="text-xs text-muted">{fmtDate(o.createdAt)}</span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {o.items.slice(0, 3).map((it) => (
                    <span key={it.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                      {it.image ? (
                        <Image src={it.image} alt="" fill sizes="56px" className="object-cover" />
                      ) : (
                        <ProductArt art={it.art} glyphClassName="!h-[40%]" />
                      )}
                    </span>
                  ))}
                  {o.items.length > 3 ? (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-xs font-semibold text-muted">
                      +{o.items.length - 3}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.itemsSummary}</p>
                  <p className="text-xs text-muted">
                    {o.count} item{o.count === 1 ? "" : "s"} ·{" "}
                    <span className="readout font-semibold text-foreground">{formatINR(o.total)}</span>
                  </p>
                </div>
              </div>

              {o.showProgress ? (
                <div className="mt-4 border-t border-border pt-4">
                  <ShipmentProgress stage={o.stage} />
                </div>
              ) : null}

              <div className="mt-3 border-t border-border pt-3">
                <OrderActions
                  orderNumber={o.orderNumber}
                  items={o.items.map((i) => ({ id: i.id, qty: i.qty }))}
                  canCancel={o.canCancel}
                  canDispute={o.canDispute}
                  canWarranty={o.canWarranty}
                  trackLabel={o.trackLabel}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-faint">
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ship to</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-surface-2">
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">{o.orderNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(o.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{o.paymentLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 readout font-semibold">{formatINR(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <OrderStatusBadge status={o.status as OrderStatus} />
                      <RtoBadge rtoStatus={o.rtoStatus} customerFacing />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{o.address}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/order/${o.orderNumber}`} className="font-medium text-accent hover:underline">
                      {o.trackLabel}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
