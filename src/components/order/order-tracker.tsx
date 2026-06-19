"use client";

import * as React from "react";
import { Check, Truck } from "lucide-react";

const STEPS = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered"] as const;

/**
 * Animated order timeline: a delivery truck travels left→right along the track
 * and parks at the current stage. Reached stops fill in; the rest stay grey.
 */
export function OrderTracker({ currentStep }: { currentStep: number }) {
  const last = STEPS.length - 1;
  const step = Math.min(Math.max(currentStep, 0), last);
  const target = step / last; // 0..1 position along the track

  // Animate from the start on mount so the truck "drives in" to the current stage.
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setProgress(target), 200);
    return () => clearTimeout(t);
  }, [target]);

  // Stops sit at column centres: 10%, 30%, 50%, 70%, 90% → track spans 10%–90%.
  const leftAt = (p: number) => `calc(10% + 80% * ${p})`;

  return (
    <div className="relative pt-1">
      {/* base track + filled progress, centred on the circle row (≈16px down) */}
      <div className="absolute left-[10%] right-[10%] top-4 h-1 -translate-y-1/2 rounded-full bg-border" />
      <div
        className="absolute left-[10%] top-4 h-1 -translate-y-1/2 rounded-full bg-accent transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
        style={{ width: `calc(80% * ${progress})` }}
      />

      {/* stops */}
      <ol className="relative grid grid-cols-5">
        {STEPS.map((s, i) => {
          const reached = i <= step;
          return (
            <li key={s} className="flex flex-col items-center gap-2 text-center">
              <span
                className={
                  reached
                    ? "grid h-8 w-8 place-items-center rounded-full bg-accent text-on-accent transition-colors"
                    : "grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-faint transition-colors"
                }
              >
                {reached ? (
                  <Check size={15} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={`text-[0.6875rem] font-medium ${reached ? "text-foreground" : "text-faint"}`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>

      {/* the travelling delivery truck (parks on the current stop) */}
      <div
        className="absolute top-4 z-10 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-[1400ms] ease-out motion-reduce:transition-none"
        style={{ left: leftAt(progress) }}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-on-accent shadow-lg ring-4 ring-surface">
          <Truck size={18} />
        </span>
      </div>
    </div>
  );
}
