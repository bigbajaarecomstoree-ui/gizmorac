"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Share the current product — native Web Share sheet on supported devices
 * (mobile), with a copy-link fallback (+ "Link copied" confirmation) elsewhere.
 */
export function ShareButton({
  title,
  text,
  className,
}: {
  title: string;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text: text ?? title, url });
        return;
      } catch {
        // user dismissed the share sheet — fall through to copy
      }
    }
    try {
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — nothing more we can do
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this product"
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius)] border border-border-bright px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer",
        className,
      )}
    >
      {copied ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
