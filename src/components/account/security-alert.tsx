import { ShieldCheck, CheckCircle2 } from "lucide-react";

const POINTS = [
  "GIZMORAC will never ask for your bank details, UPI PIN, card number, or OTP — and never asks for any payment after you've placed an order.",
  "If you get a WhatsApp, SMS, or call asking for an extra payment, a “processing fee”, or your refund details, it's a scam — please ignore it.",
  "Always track your order and check its real status right here on your account page.",
];

/**
 * Anti-fraud notice for the customer's orders area. Post-order payment/refund
 * scams (fake "delivery fee" / "refund processing") are common in India, so we
 * surface a clear, reassuring warning where customers manage their orders.
 */
export function SecurityAlert() {
  return (
    <div className="overflow-hidden rounded-2xl border border-accent/30 bg-accent-soft/40">
      <div className="flex items-center gap-2.5 border-b border-accent/20 px-5 py-3">
        <ShieldCheck size={20} className="shrink-0 text-accent" />
        <h2 className="font-semibold">Important security alert</h2>
      </div>
      <ul className="space-y-2.5 px-5 py-4">
        {POINTS.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm text-muted">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
