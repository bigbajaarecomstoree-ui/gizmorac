"use client";

import * as React from "react";
import { Loader2, Wallet, Truck, RotateCcw, Check } from "lucide-react";
import {
  markDeliveryCollected,
  markDeliveryFailed,
  markRtoInitiated,
  markRtoReceived,
  overridePaymentStatus,
  type CodOpResult,
} from "@/lib/admin/cod-actions";
import { formatINR } from "@/lib/format";

export interface CodPanelProps {
  orderId: string;
  total: number;
  codAdvancePaise: number;
  codRemainingPaise: number;
  paymentStatus: string;
  deliveryPaymentStatus: string;
  rtoStatus: string;
}

function Pill({ label, tone }: { label: string; tone: "green" | "yellow" | "red" | "orange" | "gray" }) {
  const cls = {
    green: "bg-success/10 text-success",
    yellow: "bg-accent-soft text-accent-bright",
    red: "bg-danger/10 text-danger",
    orange: "bg-accent-soft text-accent-bright",
    gray: "bg-surface-2 text-muted",
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function payTone(s: string): "green" | "yellow" | "gray" | "red" {
  if (s === "Paid") return "green";
  if (s === "PartiallyPaid") return "yellow";
  if (s === "Failed") return "red";
  return "gray";
}
function deliveryTone(s: string): "green" | "yellow" | "red" | "gray" {
  if (s === "COLLECTED") return "green";
  if (s === "FAILED") return "red";
  if (s === "PENDING") return "yellow";
  return "gray";
}

export function CodPanel({
  orderId, total, codAdvancePaise, codRemainingPaise, paymentStatus, deliveryPaymentStatus, rtoStatus,
}: CodPanelProps) {
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [override, setOverride] = React.useState(paymentStatus || "Pending");

  const dueRupees = codAdvancePaise > 0 ? codRemainingPaise / 100 : total;
  const collected = deliveryPaymentStatus === "COLLECTED";
  const rtoActive = rtoStatus !== "NONE";

  function run(fn: () => Promise<CodOpResult>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? r.note ?? "Done." : r.error ?? "Failed." });
    });
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-bright px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50 cursor-pointer";

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Wallet size={18} className="text-accent" /> COD &amp; RTO
      </h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Order total</dt><dd className="font-medium">{formatINR(total)}</dd></div>
        {codAdvancePaise > 0 ? (
          <div className="flex justify-between"><dt className="text-muted">Advance paid</dt><dd className="font-medium text-accent">{formatINR(codAdvancePaise / 100)}</dd></div>
        ) : null}
        <div className="flex justify-between"><dt className="text-muted">Collect on delivery</dt><dd className="font-medium">{formatINR(dueRupees)}</dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted">Payment status</dt><dd><Pill label={paymentStatus || "Pending"} tone={payTone(paymentStatus)} /></dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted">Delivery payment</dt><dd><Pill label={deliveryPaymentStatus || "PENDING"} tone={deliveryTone(deliveryPaymentStatus || "PENDING")} /></dd></div>
        <div className="flex items-center justify-between"><dt className="text-muted">RTO status</dt><dd><Pill label={rtoStatus} tone={rtoActive ? "red" : "gray"} /></dd></div>
      </dl>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {!collected ? (
          <button type="button" disabled={pending} onClick={() => run(() => markDeliveryCollected(orderId))} className={`${btn} w-full`}>
            <Check size={15} /> Mark delivery payment collected ({formatINR(dueRupees)})
          </button>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-success"><Check size={15} /> Delivery payment collected</p>
        )}

        {/* RTO lifecycle */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" disabled={pending || rtoStatus !== "NONE"} onClick={() => run(() => markDeliveryFailed(orderId))} className={btn}>
            <Truck size={15} /> Delivery failed
          </button>
          <button type="button" disabled={pending || !["NONE", "DELIVERY_FAILED"].includes(rtoStatus)} onClick={() => run(() => markRtoInitiated(orderId))} className={btn}>
            <RotateCcw size={15} /> RTO initiated
          </button>
          <button type="button" disabled={pending || rtoStatus === "RTO_RECEIVED"} onClick={() => run(() => markRtoReceived(orderId))} className={btn}>
            <Check size={15} /> RTO received
          </button>
        </div>

        {/* payment override */}
        <div className="flex items-center gap-2 pt-1">
          <select value={override} onChange={(e) => setOverride(e.target.value)} className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent">
            {["Pending", "PartiallyPaid", "Paid", "Failed"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" disabled={pending} onClick={() => run(() => overridePaymentStatus(orderId, override))} className={btn}>
            Override
          </button>
        </div>
      </div>

      {pending ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Working…</p>
      ) : msg ? (
        <p className={`mt-3 text-sm ${msg.ok ? "text-success" : "text-danger"}`} role="status">{msg.text}</p>
      ) : null}
    </div>
  );
}
