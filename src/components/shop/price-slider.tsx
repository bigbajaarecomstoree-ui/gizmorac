"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { buildShopUrl, type RawParams } from "@/lib/shop-url";
import { formatINR } from "@/lib/format";

/**
 * Max-price slider for the shop filters. Slides from `floor` (₹100) to `ceil`
 * (the most expensive product) and pushes the result to the URL — debounced so
 * the product list updates live as you drag.
 */
export function PriceSlider({
  floor,
  ceil,
  value,
  params,
}: {
  floor: number;
  ceil: number;
  value: number;
  params: RawParams;
}) {
  const router = useRouter();
  const [val, setVal] = React.useState(value);
  const [prevValue, setPrevValue] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync when the URL (and so the server value) changes — adjust during
  // render rather than in an effect (React's recommended pattern).
  if (value !== prevValue) {
    setPrevValue(value);
    setVal(value);
  }

  function onInput(next: number) {
    setVal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.push(
        buildShopUrl(params, {
          maxPrice: next < ceil ? String(next) : undefined,
          page: undefined,
        }),
        { scroll: false },
      );
    }, 400);
  }

  return (
    <div className="px-1 pt-1">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted">Up to</span>
        <span className="font-semibold tabular-nums">{formatINR(val)}</span>
      </div>
      <input
        type="range"
        min={floor}
        max={ceil}
        step={100}
        value={val}
        onChange={(e) => onInput(Number(e.target.value))}
        aria-label="Maximum price"
        className="h-6 w-full cursor-pointer accent-accent"
      />
      <div className="mt-1.5 flex justify-between text-[0.6875rem] text-faint">
        <span>{formatINR(floor)}</span>
        <span>{formatINR(ceil)}</span>
      </div>
    </div>
  );
}
