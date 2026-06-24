"use client";

import * as React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

const POINTS = [
  "GIZMORAC will never ask for your bank details, UPI PIN, card number, or OTP — and never asks for any payment after you've placed an order.",
  "If you get a WhatsApp, SMS, or call asking for an extra payment, a “processing fee”, or your refund details, it's a scam — please ignore it.",
  "Delivery partners never collect extra charges at the door beyond a COD amount shown on your order.",
  "Always track your order and check its real status right here on your account page.",
];

/**
 * Anti-fraud notice for the customer's orders area. Post-order payment/refund
 * scams (fake "delivery fee" / "refund processing") are common in India, so we
 * surface a clear, reassuring warning — rotating tips keep it noticeable.
 */
export function SecurityAlert() {
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % POINTS.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/30 bg-accent-soft/40">
      <div className="flex items-center justify-between gap-2.5 border-b border-accent/20 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="shrink-0 text-accent" />
          <h2 className="font-semibold">Important security alert</h2>
        </div>
        <div className="flex gap-1.5">
          {POINTS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Security tip ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-4 bg-accent" : "w-1.5 bg-accent/30 hover:bg-accent/50"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2.5 px-5 py-4 text-sm text-muted">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
        <p key={i} className="animate-in fade-in duration-500">
          {POINTS[i]}
        </p>
      </div>
    </div>
  );
}
