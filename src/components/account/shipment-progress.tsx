import { Package, Truck, MapPin, CheckCircle2 } from "lucide-react";

const STEPS = [
  { label: "Processing", icon: Package },
  { label: "Shipped", icon: Truck },
  { label: "Out for delivery", icon: MapPin },
  { label: "Delivered", icon: CheckCircle2 },
];

/** Horizontal 4-step delivery tracker. `stage` is 1–4 (current step). */
export function ShipmentProgress({ stage }: { stage: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const step = i + 1;
        const done = step < stage;
        const active = step === stage;
        const reached = step <= stage;
        return (
          <div key={s.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`grid size-8 place-items-center rounded-full border transition-colors ${
                  reached
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-surface text-faint"
                } ${active ? "ring-2 ring-accent/30" : ""}`}
              >
                <s.icon size={15} />
              </span>
              <span
                className={`mt-1.5 max-w-[4.5rem] text-center text-[10px] leading-tight ${
                  reached ? "font-medium text-foreground" : "text-faint"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span
                className={`mx-1 mb-4 h-0.5 flex-1 rounded-full ${
                  done ? "bg-accent" : "bg-border"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
