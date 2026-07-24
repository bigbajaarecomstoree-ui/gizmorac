"use client";

import * as React from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  adminRequestReturn,
  adminSchedulePickup,
  adminMarkPickedUp,
  adminReceiveForQc,
  adminRunQc,
  adminRefundItem,
  adminCompleteRefund,
  adminApproveReplacement,
  adminMarkReplacementDelivered,
  adminCloseItem,
  adminAdvanceFulfillment,
  adminCancelOrder,
  type OpResult,
} from "@/lib/admin/postorder-actions";
import type { ReturnReason } from "@prisma/client";

export interface OpItem {
  id: string;
  name: string;
  qty: number;
  status: string;
  netPaidPaise: number;
  returnReason: string | null;
}

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "CHANGE_OF_MIND", label: "Change of mind" },
  { value: "SIZE_ISSUE", label: "Size issue" },
  { value: "DEFECTIVE_PRODUCT", label: "Defective product" },
  { value: "DAMAGED_PRODUCT", label: "Damaged product" },
  { value: "WRONG_ITEM_RECEIVED", label: "Wrong item received" },
  { value: "DELIVERY_DAMAGE", label: "Delivery damage" },
  { value: "MISSING_ACCESSORIES", label: "Missing accessories" },
  { value: "QUALITY_ISSUE", label: "Quality issue" },
];

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "bg-surface-2 text-muted",
  RETURN_REQUESTED: "bg-accent/10 text-accent",
  UNDER_INVESTIGATION: "bg-accent/10 text-accent",
  PICKUP_SCHEDULED: "bg-accent/10 text-accent",
  PICKED_UP: "bg-accent/10 text-accent",
  QC_PENDING: "bg-accent/10 text-accent",
  QC_PASSED: "bg-success/10 text-success",
  QC_PARTIAL: "bg-success/10 text-success",
  QC_FAILED: "bg-danger/10 text-danger",
  REFUND_APPROVED: "bg-success/10 text-success",
  REPLACEMENT_APPROVED: "bg-success/10 text-success",
  REFUNDED: "bg-success/10 text-success",
  REPLACED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  CLOSED: "bg-surface-2 text-faint",
};
const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const label = (s: string) => s.replace(/_/g, " ");

const FULFILMENT_NEXT: Record<string, { to: string; label: string }[]> = {
  PENDING: [{ to: "CONFIRMED", label: "Confirm" }],
  CONFIRMED: [{ to: "PROCESSING", label: "Process" }],
  PROCESSING: [{ to: "SHIPPED", label: "Mark shipped" }],
  SHIPPED: [{ to: "OUT_FOR_DELIVERY", label: "Out for delivery" }, { to: "DELIVERED", label: "Mark delivered" }, { to: "RTO", label: "RTO" }],
  OUT_FOR_DELIVERY: [{ to: "DELIVERED", label: "Mark delivered" }, { to: "RTO", label: "RTO" }],
};

const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60";

export function OrderOperations({
  orderId,
  orderStatus,
  rtoStatus = "NONE",
  items,
}: {
  orderId: string;
  orderStatus: string;
  rtoStatus?: string;
  items: OpItem[];
}) {
  const [pending, start] = React.useTransition();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  function run(key: string, fn: () => Promise<OpResult>) {
    setBusyKey(key);
    setMsg(null);
    start(async () => {
      const res = await fn();
      setBusyKey(null);
      setMsg({ ok: res.ok, text: res.ok ? res.note ?? "Done" : res.error ?? "Something went wrong" });
    });
  }

  const canCancel = ["PENDING", "CONFIRMED", "PROCESSING"].includes(orderStatus);
  // While a parcel is returning, the only sensible transition is RTO —
  // "Out for delivery" / "Mark delivered" would contradict the courier.
  const rtoActive = rtoStatus === "DELIVERY_FAILED" || rtoStatus === "RTO_INITIATED";
  const fulfilment = (FULFILMENT_NEXT[orderStatus] ?? []).filter(
    (f) => !rtoActive || f.to === "RTO",
  );
  // Customer returns only exist for parcels that actually reached the customer.
  const returnable = orderStatus === "DELIVERED";

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">Order operations</h2>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
          derived: {label(orderStatus)}
        </span>
      </div>

      {/* order-level fulfilment + cancel */}
      {(fulfilment.length > 0 || canCancel) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {fulfilment.map((f) => (
            <button key={f.to} type="button" disabled={pending} className={btn}
              onClick={() => run(`ff-${f.to}`, () => adminAdvanceFulfillment(orderId, f.to))}>
              {busyKey === `ff-${f.to}` && <Loader2 size={12} className="animate-spin" />} {f.label}
            </button>
          ))}
          {canCancel && (
            <button type="button" disabled={pending} className={`${btn} hover:border-danger hover:text-danger`}
              onClick={() => { if (confirm("Cancel this order? Items close and a paid order is refunded.")) run("cancel", () => adminCancelOrder(orderId)); }}>
              {busyKey === "cancel" && <Loader2 size={12} className="animate-spin" />} Cancel order
            </button>
          )}
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-1.5 px-5 py-2 text-xs ${msg.ok ? "text-success" : "text-danger"}`} role="status">
          {msg.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {msg.text}
        </div>
      )}

      <div className="divide-y divide-border">
        {items.map((it) => (
          <ItemRow key={it.id} orderId={orderId} item={it} returnable={returnable} pending={pending} busyKey={busyKey} run={run} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({
  orderId, item, returnable, pending, busyKey, run,
}: {
  orderId: string;
  item: OpItem;
  returnable: boolean;
  pending: boolean;
  busyKey: string | null;
  run: (key: string, fn: () => Promise<OpResult>) => void;
}) {
  const [reason, setReason] = React.useState<ReturnReason>("CHANGE_OF_MIND");
  const k = (a: string) => `${item.id}:${a}`;
  const id = item.id;
  const busy = (a: string) => busyKey === k(a);
  const Spin = ({ a }: { a: string }) => (busy(a) ? <Loader2 size={12} className="animate-spin" /> : null);

  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 line-clamp-1 text-sm font-medium">{item.name}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[item.status] ?? "bg-surface-2 text-muted"}`}>
          {label(item.status)}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-faint">
        qty {item.qty} · net {inr(item.netPaidPaise)}{item.returnReason ? ` · ${label(item.returnReason)}` : ""}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.status === "ACTIVE" && returnable && (
          <>
            <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs">
              {RETURN_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("ret"), () => adminRequestReturn(orderId, id, reason))}>
              <Spin a="ret" /> Start return
            </button>
          </>
        )}
        {(item.status === "RETURN_REQUESTED" || item.status === "UNDER_INVESTIGATION") && (
          <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("pick"), () => adminSchedulePickup(orderId, id))}>
            <Spin a="pick" /> Schedule pickup
          </button>
        )}
        {item.status === "PICKUP_SCHEDULED" && (
          <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("up"), () => adminMarkPickedUp(orderId, id))}>
            <Spin a="up" /> Mark picked up
          </button>
        )}
        {item.status === "PICKED_UP" && (
          <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("qcr"), () => adminReceiveForQc(orderId, id))}>
            <Spin a="qcr" /> Receive for QC
          </button>
        )}
        {item.status === "QC_PENDING" && (
          <>
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("qcp"), () => adminRunQc(orderId, id, "PASSED", "refund"))}><Spin a="qcp" /> QC pass → refund</button>
            <button type="button" disabled={pending} className={btn} onClick={() => run(k("qcrp"), () => adminRunQc(orderId, id, "PASSED", "replacement"))}><Spin a="qcrp" /> QC pass → replace</button>
            <button type="button" disabled={pending} className={btn} onClick={() => run(k("qcpa"), () => adminRunQc(orderId, id, "PARTIAL"))}><Spin a="qcpa" /> QC partial</button>
            <button type="button" disabled={pending} className={`${btn} hover:border-danger hover:text-danger`} onClick={() => run(k("qcf"), () => adminRunQc(orderId, id, "FAILED"))}><Spin a="qcf" /> QC fail</button>
          </>
        )}
        {item.status === "QC_PASSED" && (
          <>
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("rf"), () => adminRefundItem(orderId, id))}><Spin a="rf" /> Approve refund</button>
            <button type="button" disabled={pending} className={btn} onClick={() => run(k("rp"), () => adminApproveReplacement(orderId, id))}><Spin a="rp" /> Approve replacement</button>
          </>
        )}
        {item.status === "QC_PARTIAL" && (
          <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("rf"), () => adminRefundItem(orderId, id))}><Spin a="rf" /> Approve refund</button>
        )}
        {item.status === "REFUND_APPROVED" && (
          <>
            <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("rf"), () => adminRefundItem(orderId, id))}><Spin a="rf" /> Send refund</button>
            <button type="button" disabled={pending} className={btn} onClick={() => run(k("rfc"), () => adminCompleteRefund(orderId, id))}><Spin a="rfc" /> Mark refund paid</button>
          </>
        )}
        {item.status === "REPLACEMENT_APPROVED" && (
          <button type="button" disabled={pending} className={btnPrimary} onClick={() => run(k("rd"), () => adminMarkReplacementDelivered(orderId, id))}><Spin a="rd" /> Mark replacement delivered</button>
        )}
        {["REJECTED", "REFUNDED", "REPLACED"].includes(item.status) && (
          <button type="button" disabled={pending} className={btn} onClick={() => run(k("cl"), () => adminCloseItem(orderId, id))}><Spin a="cl" /> Close item</button>
        )}
        {item.status === "CLOSED" && <span className="text-xs text-faint">Closed · no further action</span>}
      </div>
    </div>
  );
}
