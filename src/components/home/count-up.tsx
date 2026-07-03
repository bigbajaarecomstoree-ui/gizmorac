"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Counts a stat up from 0 to its target the first time it scrolls into view.
 * Parses the display string (e.g. "10,000+", "4.7+") so it keeps any prefix,
 * suffix and decimal precision, and re-formats each frame with Indian grouping.
 * Honours prefers-reduced-motion by jumping straight to the final value.
 */
type Parsed = { prefix: string; suffix: string; decimals: number; target: number };

function parseValue(value: string): Parsed | null {
  const m = value.match(/\d[\d.,]*/);
  if (!m) return null;
  const raw = m[0];
  const idx = m.index ?? 0;
  return {
    prefix: value.slice(0, idx),
    suffix: value.slice(idx + raw.length),
    decimals: raw.includes(".") ? raw.split(".")[1].length : 0,
    target: parseFloat(raw.replace(/,/g, "")),
  };
}

function fmt(n: number, decimals: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const DURATION_MS = 1400;

export function CountUp({ value, className }: { value: string; className?: string }) {
  // Memoised so its reference is stable across re-renders — otherwise the
  // animation effect below would re-run on every setN tick, cancel its own
  // rAF loop and restart, leaving the counter stuck near 0.
  const parsed = useMemo(() => parseValue(value), [value]);
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  const decimals = parsed?.decimals ?? 0;

  useEffect(() => {
    if (!parsed) return;
    const el = ref.current;
    if (!el) return;
    const target = parsed.target;

    // Reduced motion → show the final value, no animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return;
    }

    let raf = 0;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let started = false;
    const animate = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / DURATION_MS);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        setN(p < 1 ? target * eased : target);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      // Safety net: rAF is paused in background tabs, so guarantee the final
      // value lands even if the frame loop never runs to completion.
      fallback = setTimeout(() => setN(target), DURATION_MS + 250);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            animate();
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      if (fallback) clearTimeout(fallback);
    };
  }, [parsed]);

  if (!parsed) return <span className={className}>{value}</span>;

  return (
    <span ref={ref} className={className}>
      {parsed.prefix}
      {fmt(n, decimals)}
      {parsed.suffix}
    </span>
  );
}
