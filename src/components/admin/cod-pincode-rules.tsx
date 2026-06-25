"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, Plus, Loader2, MapPin } from "lucide-react";
import { saveCodPincodeRule, deleteCodPincodeRule, type CodOpResult } from "@/lib/admin/cod-actions";
import { type CodPincodeRule } from "@/lib/data/cod-pincode";

const MODES: { value: string; label: string }[] = [
  { value: "STANDARD", label: "Standard COD" },
  { value: "HIGHER_CHARGE", label: "Higher advance" },
  { value: "PREPAID_ONLY", label: "Prepaid only" },
  { value: "COD_DISABLED", label: "COD disabled" },
];
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));

const inputCls =
  "h-10 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function AddBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer">
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Add
    </button>
  );
}

export function CodPincodeRules({ rules }: { rules: CodPincodeRule[] }) {
  const [state, action] = useActionState<CodOpResult | undefined, FormData>(
    async (_prev, fd) => saveCodPincodeRule(fd),
    undefined,
  );
  const [mode, setMode] = React.useState("STANDARD");
  const [pending, start] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <MapPin size={18} className="text-accent" /> Pincode COD rules
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        Disable COD, force prepaid, or raise the booking advance for specific pincodes.
      </p>

      <form ref={formRef} action={action} className="mt-4 flex flex-wrap items-center gap-2">
        <input name="pincode" inputMode="numeric" maxLength={6} placeholder="6-digit pincode" className={`${inputCls} w-36`} required />
        <select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className={`${inputCls} w-40`}>
          {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {mode === "HIGHER_CHARGE" ? (
          <input name="advanceOverride" type="number" min="0" step="1" placeholder="Advance ₹" className={`${inputCls} w-28`} />
        ) : (
          <input type="hidden" name="advanceOverride" value="" />
        )}
        <input name="note" placeholder="Note (optional)" className={`${inputCls} min-w-0 flex-1`} />
        <AddBtn />
      </form>
      {state?.error ? <p className="mt-2 text-sm text-danger" role="alert">{state.error}</p> : null}

      <div className="mt-4 divide-y divide-border border-t border-border">
        {rules.length === 0 ? (
          <p className="py-4 text-sm text-muted">No pincode rules yet — COD follows the global settings everywhere.</p>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-mono font-semibold">{r.pincode}</span>
                <span className="ml-2 text-muted">{MODE_LABEL[r.mode] ?? r.mode}</span>
                {r.advanceOverride != null ? <span className="ml-2 text-accent">₹{r.advanceOverride}</span> : null}
                {r.note ? <span className="ml-2 truncate text-xs text-faint">· {r.note}</span> : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => { deleteCodPincodeRule(r.id); })}
                aria-label={`Delete rule for ${r.pincode}`}
                className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
