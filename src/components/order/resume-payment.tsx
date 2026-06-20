"use client";

import * as React from "react";
import { Loader2, CreditCard } from "lucide-react";
import { startPhonePePayment } from "@/lib/storefront/actions";

export function ResumePayment({ orderNumber }: { orderNumber: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const res = await startPhonePePayment(orderNumber);
    if (res.ok) {
      window.location.href = res.redirectUrl;
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
        {busy ? "Redirecting…" : "Complete payment"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
