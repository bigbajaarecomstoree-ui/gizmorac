"use client";

import * as React from "react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const DAY_MS = 86_400_000;

/** Daily-deal window: once the passed target expires (page left open past
 * midnight, or served slightly stale), roll it forward in whole days so the
 * timer counts to the NEXT midnight instead of parking at 00:00:00. */
function effectiveTarget(target: number) {
  let t = target;
  while (t <= Date.now()) t += DAY_MS;
  return t;
}

function remaining(target: number) {
  const diff = Math.max(0, effectiveTarget(target) - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

function Segment({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="readout !text-on-accent grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-[#9333ea] text-xl font-bold tabular-nums shadow-[0_10px_22px_-10px_rgba(109,40,217,0.7)] sm:h-14 sm:w-14 sm:text-2xl"
        suppressHydrationWarning
      >
        {/* Re-mount on value change so the digit pops in on every tick. */}
        <span key={value} className="animate-pop inline-block">
          {value}
        </span>
      </span>
      <span className="tech-label !text-[0.5625rem]">{label}</span>
    </div>
  );
}

export function Countdown({ target }: { target: number }) {
  const [t, setT] = React.useState(() => remaining(target));

  React.useEffect(() => {
    const id = setInterval(() => setT(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="flex items-end gap-2">
      <Segment value={pad(t.h)} label="Hrs" />
      <span className="animate-blink readout pb-6 text-xl font-bold sm:text-2xl">:</span>
      <Segment value={pad(t.m)} label="Min" />
      <span className="animate-blink readout pb-6 text-xl font-bold sm:text-2xl">:</span>
      <Segment value={pad(t.s)} label="Sec" />
    </div>
  );
}
