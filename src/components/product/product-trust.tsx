import { ShieldCheck, Truck, Banknote, RotateCcw } from "lucide-react";

function warrantyLabel(months: number): string {
  if (months >= 12) {
    const y = Math.round(months / 12);
    return `${y}-Year Manufacturer Warranty`;
  }
  if (months > 0) return `${months}-Month Warranty`;
  return "Quality Assured";
}

const PAYMENTS: { src: string; alt: string }[] = [
  { src: "/payments/visa.svg", alt: "Visa" },
  { src: "/payments/mastercard.svg", alt: "Mastercard" },
  { src: "/payments/upi.svg", alt: "UPI" },
];

/** PDP trust block — warranty, delivery promises, and accepted payment methods. */
export function ProductTrust({
  warrantyMonths,
  freeShippingThreshold = 999,
}: {
  warrantyMonths: number;
  freeShippingThreshold?: number;
}) {
  const delivery = [
    { icon: Truck, title: "Delivery in 2–5 days", sub: "Pan India" },
    { icon: Banknote, title: "Cash on Delivery", sub: "Available" },
    { icon: RotateCcw, title: "7-day Replacement", sub: "Easy returns" },
  ];

  return (
    <div className="space-y-4">
      {/* warranty highlight */}
      <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft/40 px-4 py-3">
        <ShieldCheck size={24} className="shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{warrantyLabel(warrantyMonths)}</p>
          <p className="text-xs text-muted">Covered against manufacturing defects</p>
        </div>
      </div>

      {/* delivery promises */}
      <div className="grid grid-cols-3 gap-3">
        {delivery.map((d) => (
          <div
            key={d.title}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-3 text-center"
          >
            <d.icon size={18} className="text-accent" />
            <span className="text-[0.6875rem] font-semibold leading-tight text-foreground">
              {d.title}
            </span>
            <span className="text-[0.625rem] leading-tight text-faint">{d.sub}</span>
          </div>
        ))}
      </div>

      {/* free-shipping note + payment methods */}
      <div className="rounded-xl border border-border bg-surface p-3.5">
        <p className="mb-2.5 flex items-center justify-between text-xs font-medium text-muted">
          <span>Secure payment options</span>
          <span className="text-faint">Free shipping over ₹{freeShippingThreshold}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {PAYMENTS.map((p) => (
            <span
              key={p.alt}
              className="grid h-8 w-12 place-items-center rounded-md border border-border bg-surface px-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} className="max-h-4 w-auto object-contain" />
            </span>
          ))}
          {["COD", "EMI"].map((t) => (
            <span
              key={t}
              className="grid h-8 place-items-center rounded-md border border-accent-dim/50 bg-accent-soft px-2.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent-bright"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
