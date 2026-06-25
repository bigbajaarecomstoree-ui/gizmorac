"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Info } from "lucide-react";
import { updateCodSettings, type SettingsState } from "@/lib/admin/actions";
import type { StoreSettings } from "@/lib/data/settings";
import { computeCodAdvance } from "@/lib/data/cod";
import { formatINR } from "@/lib/format";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : null}
      Save COD settings
    </button>
  );
}

export function CodSettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, action] = useActionState<SettingsState | undefined, FormData>(
    updateCodSettings,
    undefined,
  );

  // Local mirror drives the live preview (same formula as the server helper).
  const [enabled, setEnabled] = useState(settings.codAdvanceEnabled);
  const [type, setType] = useState(settings.codAdvanceType === "PERCENT" ? "PERCENT" : "FIXED");
  const [amount, setAmount] = useState(String(settings.codAdvanceAmount));
  const [percent, setPercent] = useState(String(settings.codAdvancePercent));
  const [max, setMax] = useState(String(settings.codAdvanceMax));
  const [min, setMin] = useState(String(settings.codAdvanceMin));
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state]);

  const preview = computeCodAdvance(
    {
      ...settings,
      codAdvanceEnabled: enabled,
      codAdvanceType: type,
      codAdvanceAmount: Number(amount) || 0,
      codAdvancePercent: Number(percent) || 0,
      codAdvanceMax: Number(max) || 0,
      codAdvanceMin: Number(min) || 0,
    },
    1499,
  );

  return (
    <form action={action} className="space-y-5">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">COD Advance Payment</h2>
        <p className="mt-0.5 text-xs text-muted">
          Collect a small online booking amount for COD orders; the rest is collected on delivery.
          While this is off, COD works exactly as it does today.
        </p>

        <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
          <span>
            <span className="block text-sm font-medium">Enable COD Advance</span>
            <span className="block text-xs text-muted">Master switch for the whole module.</span>
          </span>
          <input
            type="checkbox"
            name="codAdvanceEnabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 accent-accent cursor-pointer"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Charge type</span>
            <select
              name="codAdvanceType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputCls}
            >
              <option value="FIXED">Fixed amount</option>
              <option value="PERCENT">Percentage of order</option>
            </select>
          </label>

          {type === "FIXED" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Booking amount (₹)</span>
              <input
                name="codAdvanceAmount"
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Advance percentage (%)</span>
              <input
                name="codAdvancePercent"
                type="number"
                min="0"
                max="100"
                step="1"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className={inputCls}
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Maximum advance (₹)</span>
            <input
              name="codAdvanceMax"
              type="number"
              min="0"
              step="1"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-faint">Caps the percentage advance.</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Minimum advance (₹)</span>
            <input
              name="codAdvanceMin"
              type="number"
              min="0"
              step="1"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-faint">0 = no floor.</span>
          </label>

          {/* keep hidden inputs mounted so the unselected type still submits a value */}
          {type === "FIXED" ? (
            <input type="hidden" name="codAdvancePercent" value={percent} />
          ) : (
            <input type="hidden" name="codAdvanceAmount" value={amount} />
          )}
        </div>

        {/* live preview */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-muted">
            {enabled ? (
              <>
                On a <span className="font-semibold text-foreground">{formatINR(1499)}</span> COD order:
                pay now <span className="font-semibold text-accent">{formatINR(preview.advance)}</span>,
                collect on delivery{" "}
                <span className="font-semibold text-foreground">{formatINR(preview.remaining)}</span>.
              </>
            ) : (
              <>COD Advance is off — customers pay the full amount on delivery, as today.</>
            )}
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <SaveButton />
        {savedFlash ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <Check size={15} /> Saved
          </span>
        ) : null}
        {state?.error ? (
          <span className="text-sm text-danger" role="alert">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
