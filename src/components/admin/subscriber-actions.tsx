"use client";

import * as React from "react";
import { Copy, Check, Mail } from "lucide-react";

// Bulk-email a few hundred addresses via a mailto link stays under the ~2k char
// URL limit most mail clients accept; beyond that, "Copy all" + paste is safer.
const MAILTO_SAFE_LIMIT = 80;

export function SubscriberActions({ emails }: { emails: string[] }) {
  const [copied, setCopied] = React.useState(false);

  function copyAll() {
    navigator.clipboard?.writeText(emails.join(", ")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const mailto =
    `mailto:?bcc=${encodeURIComponent(emails.join(","))}` +
    `&subject=${encodeURIComponent("GIZMORAC — News & Offers")}`;

  if (emails.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyAll}
        className="inline-flex items-center gap-2 rounded-lg border border-border-bright px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent cursor-pointer"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied!" : "Copy all emails"}
      </button>
      <a
        href={mailto}
        className="inline-flex items-center gap-2 rounded-lg border border-border-bright px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        title={
          emails.length > MAILTO_SAFE_LIMIT
            ? "Long list — if your mail app truncates it, use Copy all instead"
            : "Opens your email app with everyone in BCC"
        }
      >
        <Mail size={16} />
        Email all (BCC)
      </a>
    </div>
  );
}
