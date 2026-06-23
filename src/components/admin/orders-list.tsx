"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Loader2,
  Inbox,
  AlertTriangle,
  Package,
  MoreVertical,
  Eye,
  Truck,
  XCircle,
  Download,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { bulkDownloadLabels, bulkMarkShipped } from "@/lib/admin/actions";
import { adminCancelOrder } from "@/lib/admin/postorder-actions";
import { formatINR } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  itemsLabel: string;
  meta: string; // customer · date
  image: string | null;
  city: string;
  paymentLabel: string; // "UPI · Paid" | "COD"
  courier: string;
  count: number;
  total: number;
  labelUrl: string;
  trackingUrl: string;
  hasShipment: boolean;
  canCancel: boolean;
}

const checkbox = "size-4 shrink-0 cursor-pointer accent-[var(--accent,#f59e0b)]";
const chip = "rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted";

/** Orders list: thumbnail, key fields, per-row ⋮ quick actions, and bulk label print. */
export function OrdersList({ rows }: { rows: OrderRow[] }) {
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => sel.has(id));
  const selectedRows = rows.filter((r) => sel.has(r.id));
  const labelTargets = rows.filter((r) => r.hasShipment);

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSel(allSelected ? new Set() : new Set(allIds));
  }

  function download() {
    setError(null);
    const ids = (selectedRows.length ? selectedRows : labelTargets)
      .filter((r) => r.hasShipment)
      .map((r) => r.id);
    if (ids.length === 0) {
      setError("None of these orders have a shipping label yet.");
      return;
    }
    start(async () => {
      const res = await bulkDownloadLabels(ids);
      if (!res.ok || !res.url) {
        setError(res.error ?? "Couldn't generate the labels.");
        return;
      }
      window.open(res.url, "_blank", "noopener");
    });
  }

  function shipSelected() {
    const ids = selectedRows.filter((r) => !r.hasShipment).map((r) => r.id);
    if (ids.length === 0) {
      setError("Select one or more orders that haven't shipped yet.");
      return;
    }
    if (!confirm(`Ship ${ids.length} order${ids.length === 1 ? "" : "s"}? Each assigns a courier, label and pickup.`)) return;
    setError(null);
    setNote(null);
    start(async () => {
      const r = await bulkMarkShipped(ids);
      setNote(`Shipped ${r.shipped}${r.failed ? `, ${r.failed} failed` : ""}.`);
    });
  }

  function cancelOrder(id: string, orderNumber: string) {
    setOpenId(null);
    if (!confirm(`Cancel ${orderNumber}? Items close, the shipment is cancelled, and a paid order is refunded.`)) return;
    setError(null);
    setNote(null);
    setCancelling(id);
    start(async () => {
      const r = await adminCancelOrder(id);
      setCancelling(null);
      if (r.ok) setNote(`${orderNumber}: ${r.note ?? "Cancelled."}`);
      else setError(`${orderNumber}: ${r.error ?? "Couldn't cancel."}`);
    });
  }

  return (
    <div>
      {rows.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className={checkbox} />
            {sel.size > 0 ? `${sel.size} selected` : `Select all (${rows.length})`}
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a
              href="/api/admin/orders/export"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Download size={15} /> Export CSV
            </a>
            <button
              type="button"
              onClick={shipSelected}
              disabled={pending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
            >
              <Truck size={15} /> Mark shipped
            </button>
            <button
              type="button"
              onClick={download}
              disabled={pending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
              Print labels
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-danger" role="alert">
          <AlertTriangle size={14} /> {error}
        </p>
      ) : null}
      {note ? (
        <p className="mb-3 text-sm text-success" role="status">{note}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <Inbox size={32} className="text-faint" />
            <p className="mt-3 text-sm text-muted">No orders match these filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={sel.has(o.id)}
                  onChange={() => toggle(o.id)}
                  aria-label={`Select ${o.orderNumber}`}
                  className={checkbox}
                />

                <Link href={`/admin/orders/${o.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package size={18} className="text-faint" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="mt-0.5 truncate text-sm text-foreground">{o.itemsLabel}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">{o.meta}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {o.city ? <span className={chip}>{o.city}</span> : null}
                      <span className={chip}>{o.paymentLabel}</span>
                      {o.courier ? <span className={chip}>{o.courier}</span> : null}
                    </div>
                  </div>
                  <div className="readout w-24 shrink-0 text-right text-sm font-semibold">
                    {formatINR(o.total)}
                  </div>
                </Link>

                {/* quick actions ⋮ */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === o.id ? null : o.id)}
                    aria-label={`Actions for ${o.orderNumber}`}
                    className="grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {cancelling === o.id ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                  </button>
                  {openId === o.id ? (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenId(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 text-sm shadow-lg">
                        <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2">
                          <Eye size={14} className="text-muted" /> View order
                        </Link>
                        <a href={`/api/admin/orders/${o.id}/invoice`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2">
                          <FileText size={14} className="text-muted" /> Print invoice
                        </a>
                        {o.labelUrl ? (
                          <a href={o.labelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2">
                            <Printer size={14} className="text-muted" /> Download label
                          </a>
                        ) : null}
                        {o.trackingUrl ? (
                          <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2">
                            <Truck size={14} className="text-muted" /> Track
                          </a>
                        ) : null}
                        {o.canCancel ? (
                          <button type="button" onClick={() => cancelOrder(o.id, o.orderNumber)} className="flex w-full items-center gap-2 px-3 py-2 text-danger hover:bg-danger/5">
                            <XCircle size={14} /> Cancel order
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
