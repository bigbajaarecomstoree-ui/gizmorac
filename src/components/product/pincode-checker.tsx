"use client";

import * as React from "react";
import { MapPin, Truck, CircleCheck, CircleX } from "lucide-react";
import { deliveryWindow } from "@/lib/format";

type Result =
  | { ok: true; eta: string; cod: boolean }
  | { ok: false; message: string };

export function PincodeChecker() {
  const [pin, setPin] = React.useState("");
  const [result, setResult] = React.useState<Result | null>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setResult({ ok: false, message: "Enter a valid 6-digit pincode." });
      return;
    }
    // Mock serviceability: a couple of ranges are non-serviceable.
    const first = pin[0];
    if (first === "1" && pin[1] === "9") {
      setResult({ ok: false, message: "Sorry, we don't deliver here yet." });
      return;
    }
    // Metro-ish pincodes get faster delivery.
    const fast = ["4", "5", "1", "7"].includes(first);
    setResult({
      ok: true,
      eta: fast ? deliveryWindow(2, 4) : deliveryWindow(4, 7),
      cod: first !== "8",
    });
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
          className="h-10 shrink-0 rounded-lg border border-border-bright px-4 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent cursor-pointer"
        >
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
