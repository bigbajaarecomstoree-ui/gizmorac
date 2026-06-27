"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Subtle 3D tilt that follows the cursor — a premium micro-interaction for
 * product imagery. Mouse-only (skips touch/pen) and honours reduced-motion.
 */
export function Tilt({
  children,
  className,
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees on each axis. */
  max?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = React.useRef(false);

  React.useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || reduced.current || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  }

  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn(
        "transition-transform duration-200 ease-out [transform-style:preserve-3d] will-change-transform",
        className,
      )}
    >
      {children}
    </div>
  );
}
