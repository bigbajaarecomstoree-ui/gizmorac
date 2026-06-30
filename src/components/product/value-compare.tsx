import { Check, X } from "lucide-react";

const ROWS: { label: string; us: boolean; them: boolean }[] = [
  { label: "Manufacturer warranty", us: true, them: false },
  { label: "Cash on Delivery", us: true, them: false },
  { label: "Easy 7-day returns", us: true, them: false },
  { label: "WhatsApp & phone support", us: true, them: false },
  { label: "GST invoice", us: true, them: false },
  { label: "Free shipping over ₹999", us: true, them: false },
  { label: "Quality-checked before dispatch", us: true, them: false },
];

/**
 * "Why buy from GIZMORAC" value comparison. Claims are about GIZMORAC's own
 * service (all true); the comparison column is a soft generalisation of typical
 * unbranded marketplace listings (see footnote) — owner can edit ROWS.
 */
export function ValueCompare() {
  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-[1fr_auto_auto]">
        <div className="bg-surface-2/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-faint" />
        <div className="bg-accent px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-on-accent">
          GIZMORAC
        </div>
        <div className="bg-surface-2/60 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-faint">
          Others
        </div>

        {ROWS.map((r, i) => (
          <div key={r.label} className="contents">
            <div
              className={`px-4 py-3 text-sm text-foreground ${i % 2 ? "bg-surface-2/40" : "bg-surface"}`}
            >
              {r.label}
            </div>
            <div
              className={`grid place-items-center px-4 py-3 ${i % 2 ? "bg-accent-soft/50" : "bg-accent-soft/30"}`}
            >
              {r.us ? (
                <Check size={18} className="text-success" />
              ) : (
                <X size={18} className="text-faint" />
              )}
            </div>
            <div
              className={`grid place-items-center px-4 py-3 ${i % 2 ? "bg-surface-2/40" : "bg-surface"}`}
            >
              {r.them ? (
                <Check size={18} className="text-success" />
              ) : (
                <X size={18} className="text-danger/70" />
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="bg-surface px-4 py-2.5 text-center text-[0.6875rem] text-faint">
        Compared with typical unbranded marketplace listings.
      </p>
    </div>
  );
}
