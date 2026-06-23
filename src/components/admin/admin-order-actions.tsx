"use client";

import * as React from "react";
import {
  FileText,
  Mail,
  MessageCircle,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { adminAdvanceFulfillment, adminCancelOrder, type OpResult } from "@/lib/admin/postorder-actions";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50";
const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60";

/** Top-right admin action bar for the order detail page. The deeper item-level
 *  flow (returns → QC → refund/replace) lives in the Order operations panel. */
export function AdminOrderActions({
  orderId,
  orderNumber,
  email,
  phone,
  canCancel,
  canMarkDelivered,
}: {
  orderId: string;
  orderNumber: string;
  email: string;
  phone: string;
  canCancel: boolean;
  canMarkDelivered: boolean;
}) {
  const [pending, start] = React.useTransition();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  function run(key: string, fn: () => Promise<OpResult>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(key);
    setMsg(null);
    start(async () => {
      const r = await fn();
      setBusy(null);
      setMsg({ ok: r.ok, text: r.ok ? r.note ?? "Done" : r.error ?? "Something went wrong" });
    });
  }

  const wa = phone ? `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}` : "";

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <a
          href={`/api/admin/orders/${orderId}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN}
        >
          <FileText size={15} /> Print invoice
        </a>
        {email ? (
          <a href={`mailto:${email}?subject=Your%20GIZMORAC%20order%20${orderNumber}`} className={BTN}>
            <Mail size={15} /> Email
          </a>
        ) : null}
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={BTN}>
            <MessageCircle size={15} /> WhatsApp
          </a>
        ) : null}
        {phone ? (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className={BTN}>
            <Phone size={15} /> Call
          </a>
        ) : null}
        {canMarkDelivered ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("deliver", () => adminAdvanceFulfillment(orderId, "DELIVERED"))}
            className={PRIMARY}
          >
            {busy === "deliver" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Mark delivered
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run("cancel", () => adminCancelOrder(orderId), "Cancel this order? Items close, the shipment is cancelled, and a paid order is refunded.")
            }
            className={`${BTN} hover:border-danger hover:text-danger`}
          >
            {busy === "cancel" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
            Cancel order
          </button>
        ) : null}
      </div>
      {msg ? (
        <p className={`flex items-center gap-1.5 text-xs ${msg.ok ? "text-success" : "text-danger"}`} role="status">
          {msg.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {msg.text}
        </p>
      ) : null}
    </div>
  );
}
