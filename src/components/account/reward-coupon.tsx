"use client";

import * as React from "react";
import { Gift, Copy, Check } from "lucide-react";

export function RewardCouponCard({
  code,
  value,
  maxDiscount,
  expiresAt,
  used,
  expired,
}: {
  code: string;
  value: number;
  maxDiscount: number;
  expiresAt: string;
  used: boolean;
  expired: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const inactive = used || expired;
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div
      className={
        inactive
          ? "rounded-xl border border-dashed border-border bg-surface p-4 opacity-60"
          : "rounded-xl border border-dashed border-accent/50 bg-accent-soft/40 p-4"
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            inactive ? "bg-surface-2 text-faint" : "bg-accent text-on-accent"
          }`}
        >
          <Gift size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {value}% off your next order
            {maxDiscount ? (
              <span className="font-normal text-muted"> (up to ₹{maxDiscount})</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {used
              ? "Already used"
              : expired
                ? `Expired on ${expiry}`
                : `Valid till ${expiry}`}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm font-semibold tracking-wider">
              {code}
            </code>
            {!inactive ? (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-bright px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={13} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
