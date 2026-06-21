"use client";

import * as React from "react";
import { MapPin, Truck, CircleCheck, CircleX, Loader2 } from "lucide-react";
import { deliveryWindow } from "@/lib/format";
import { getDeliveryEstimate } from "@/lib/storefront/actions";

type Result =
  | { ok: true; eta: string; cod: boolean }
  | { ok: false; message: string };

export function PincodeChecker() {
  const [pin, setPin] = React.useState("");
  const [result, setResult] = React.useState<Result | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setResult({ ok: false, message: "Enter a valid 6-digit pincode." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const est = await getDeliveryEstimate(pin);
      if (est.ok) {
        if (est.serviceable) {
          const d = est.days > 0 ? est.days : 3;
          setResult({ ok: true, eta: deliveryWindow(d, d + 2), cod: est.codAvailable });
        } else {
          setResult({ ok: false, message: "Sorry, we don't deliver to this pincode yet." });
        }
      } else {
        // Shiprocket not connected — graceful generic estimate so the PDP still helps.
        const first = pin[0];
        const fast = ["4", "5", "1", "7"].includes(first);
        setResult({
          ok: true,
          eta: fast ? deliveryWindow(2, 4) : deliveryWindow(4, 7),
          cod: first !== "8",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin size={16} className="text-accent" />
        Check delivery
      </div>
      <form onSubmit={check} className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          placeholder="Enter pincode"
          aria-label="Delivery pincode"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border-bright px-4 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60 cursor-pointer"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          Check
        </button>
      </form>

      {result ? (
        result.ok ? (
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-success">
              <CircleCheck size={15} />
              Delivery available
            </div>
            <div className="flex items-center gap-2 text-muted">
              <Truck size={15} className="text-faint" />
              Estimated delivery{" "}
              <span className="font-medium text-foreground">{result.eta}</span>
            </div>
            <p className="text-xs text-faint">
              {result.cod ? "Cash on Delivery available" : "Prepaid only at this pincode"}
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm text-danger">
            <CircleX size={15} />
            {result.message}
          </div>
        )
      ) : null}
    </div>
  );
}
