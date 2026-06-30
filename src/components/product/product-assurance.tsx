import { ShieldCheck, Truck, Clock4, RotateCcw, Banknote } from "lucide-react";

function warrantyShort(months: number): string {
  if (months >= 12) return `${Math.round(months / 12)}-Yr Warranty`;
  if (months > 0) return `${months}-Mo Warranty`;
  return "Quality Checked";
}

/**
 * Compact, scannable trust strip shown right under the rating — the buying
 * signals (warranty, shipping, dispatch, returns, COD) a shopper wants before
 * they read anything. Every claim here is true store-wide, no inflated numbers.
 */
export function ProductAssurance({
  warrantyMonths,
  freeShippingThreshold = 999,
}: {
  warrantyMonths: number;
  freeShippingThreshold?: number;
}) {
  const items = [
    { icon: ShieldCheck, label: warrantyShort(warrantyMonths) },
    { icon: Truck, label: `Free Shipping over ₹${freeShippingThreshold}` },
    { icon: Clock4, label: "Fast Dispatch" },
    { icon: RotateCcw, label: "7-Day Easy Returns" },
    { icon: Banknote, label: "COD Available" },
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <it.icon size={14} className="shrink-0 text-accent" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
