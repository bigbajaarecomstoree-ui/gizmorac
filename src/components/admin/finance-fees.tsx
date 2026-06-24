"use client";

import * as React from "react";
import { SlidersHorizontal, Loader2, Check } from "lucide-react";
import { saveFinanceFees } from "@/lib/admin/actions";

const numCls =
  "h-8 w-16 rounded-lg border border-border bg-surface-2 px-2 text-sm tabular-nums outline-none focus:border-accent";

/** Editable operating-cost assumptions used by the Operating Profit line. */
export function FinanceFees({
  paymentPct,
  codPct,
  codFlat,
}: {
  paymentPct: number;
  codPct: number;
  codFlat: number;
}) {
  const [p, setP] = React.useState(String(paymentPct));
  const [c, setC] = React.useState(String(codPct));
  const [f, setF] = React.useState(String(codFlat));
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const dirty = p !== String(paymentPct) || c !== String(codPct) || f !== String(codFlat);

  function save() {
    setSaved(false);
    start(async () => {
      await saveFinanceFees({ paymentFeePct: Number(p), codFeePct: Number(c), codFeeFlat: Number(f) });
      setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal size={15} className="text-accent" /> Operating-cost assumptions
      </h2>
      <p className="mb-3 text-xs text-faint">
        Used for the Operating Profit line. Shipping is captured per shipment; set your gateway &amp;
        COD fee rates here.
      </p>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className="tech-label">Gateway fee</span>
          <span className="flex items-center gap-1">
            <input type="number" min={0} max={100} step={0.1} value={p} onChange={(e) => { setP(e.target.value); setSaved(false); }} className={numCls} />
            <span className="text-sm text-muted">% of prepaid</span>
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="tech-label">COD fee</span>
          <span className="flex items-center gap-1">
            <input type="number" min={0} max={100} step={0.1} value={c} onChange={(e) => { setC(e.target.value); setSaved(false); }} className={numCls} />
            <span className="text-sm text-muted">% of COD</span>
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="tech-label">COD flat</span>
          <span className="flex items-center gap-1">
            <span className="text-sm text-muted">₹</span>
            <input type="number" min={0} value={f} onChange={(e) => { setF(e.target.value); setSaved(false); }} className={numCls} />
            <span className="text-sm text-muted">/ order</span>
          </span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : null} Save
          </button>
          {saved && !dirty ? (
            <span className="flex items-center gap-1 text-xs text-success"><Check size={13} /> Saved</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
