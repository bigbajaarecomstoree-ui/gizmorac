"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Printer,
  Loader2,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { bulkDownloadLabels } from "@/lib/admin/actions";
import { formatINR } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  itemsLabel: string;
  meta: string;
  count: number;
  total: number;
  labelUrl: string;
  hasShipment: boolean;
}

const checkbox = "size-4 shrink-0 cursor-pointer accent-[var(--accent,#f59e0b)]";

/** Orders table with per-row label download + bulk "print all labels" (one PDF). */
export function OrdersList({ rows }: { rows: OrderRow[] }) {
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const shippable = rows.filter((r) => r.hasShipment);
  const shippableIds = shippable.map((r) => r.id);
  const allSelected = shippableIds.length > 0 && shippableIds.every((id) => sel.has(id));

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSel(allSelected ? new Set() : new Set(shippableIds));
  }

  function download() {
    setError(null);
    const ids = sel.size > 0 ? [...sel] : shippableIds; // none selected → all
    if (ids.length === 0) {
      setError("No orders here have a shipping label yet.");
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

  return (
    <div>
      {shippable.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className={checkbox} />
            Select all with labels ({shippable.length})
          </label>
          <button
            type="button"
            onClick={download}
            disabled={pending}
            className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
            {sel.size > 0 ? `Print ${sel.size} label${sel.size === 1 ? "" : "s"}` : "Print all labels"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-danger" role="alert">
          <AlertTriangle size={14} /> {error}
        </p>
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
              <div key={o.id} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                {o.hasShipment ? (
                  <input
                    type="checkbox"
                    checked={sel.has(o.id)}
                    onChange={() => toggle(o.id)}
                    aria-label={`Select ${o.orderNumber}`}
                    className={checkbox}
                  />
                ) : (
                  <span className="w-4 shrink-0" />
                )}

                <Link href={`/admin/orders/${o.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="mt-0.5 truncate text-sm text-foreground">{o.itemsLabel}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">{o.meta}</div>
                  </div>
                  <div className="hidden shrink-0 text-xs text-muted sm:block">
                    {o.count} item{o.count === 1 ? "" : "s"}
                  </div>
                  <div className="readout w-24 shrink-0 text-right text-sm font-semibold">
                    {formatINR(o.total)}
                  </div>
                </Link>

                {o.labelUrl ? (
                  <a
                    href={o.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download / print shipping label"
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <FileText size={16} />
                  </a>
                ) : (
                  <span className="w-9 shrink-0" />
                )}

                <ChevronRight size={16} className="shrink-0 text-faint" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
