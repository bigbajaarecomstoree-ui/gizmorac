"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { verifyOrderPayment } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

/**
 * "Verify payment" — shown on a Pending online-payment order. Re-checks the
 * payment with PhonePe on demand (same idempotent reconcile the callback/cron
 * use) and reports the outcome inline; on a state change the page refreshes so
 * the status chips update.
 */
export function VerifyPaymentButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);

  function verify() {
    setMsg(null);
    start(async () => {
      const res = await verifyOrderPayment(orderNumber);
      if (!res.ok) {
        setMsg({ tone: "err", text: res.error });
        return;
      }
      switch (res.result) {
        case "Paid":
          setMsg({ tone: "ok", text: "Payment confirmed — order is now Confirmed." });
          router.refresh();
          break;
        case "Failed":
          setMsg({ tone: "err", text: "PhonePe reports the payment failed — order released, stock restored." });
          router.refresh();
          break;
        case "Pending":
          setMsg({ tone: "warn", text: "PhonePe still shows no completed payment for this order." });
          break;
        default:
          setMsg({ tone: "err", text: "Order not found at PhonePe." });
      }
    });
  }

  return (
    <div className="mt-2">
      <Button type="button" size="sm" variant="outline" onClick={verify} disabled={pending}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        Verify payment with PhonePe
      </Button>
      {msg ? (
        <p
          className={`mt-1.5 flex items-start gap-1.5 text-xs ${
            msg.tone === "ok" ? "text-success" : msg.tone === "warn" ? "text-accent" : "text-danger"
          }`}
          role={msg.tone === "err" ? "alert" : "status"}
        >
          {msg.tone === "ok" ? (
            <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          ) : msg.tone === "warn" ? (
            <Clock size={13} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={13} className="mt-0.5 shrink-0" />
          )}
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
