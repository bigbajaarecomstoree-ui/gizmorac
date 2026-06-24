"use client";

import * as React from "react";
import { Search, X, Inbox } from "lucide-react";

export interface SubRow {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

const SRC_LABEL: Record<string, string> = {
  footer: "Footer",
  home: "Home",
  account: "Account",
  popup: "Popup",
  checkout: "Checkout",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SubscriberList({ subscribers }: { subscribers: SubRow[] }) {
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const rows = ql ? subscribers.filter((s) => s.email.toLowerCase().includes(ql)) : subscribers;

  return (
    <div>
      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email"
          aria-label="Search subscribers"
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-faint transition-colors hover:text-foreground"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <Inbox size={26} className="text-faint" />
            <p className="mt-3 text-sm text-muted">
              {ql ? "No subscribers match that search." : "No subscribers yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2rem_1fr_7rem_12rem] gap-4 border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-faint sm:grid">
              <span>#</span>
              <span>Email</span>
              <span>Source</span>
              <span>Subscribed</span>
            </div>
            <div className="divide-y divide-border">
              {rows.map((s, i) => (
                <div
                  key={s.id}
                  className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[2rem_1fr_7rem_12rem] sm:items-center sm:gap-4"
                >
                  <span className="hidden text-faint sm:block">{i + 1}</span>
                  <a
                    href={`mailto:${s.email}`}
                    className="truncate font-medium text-accent-bright hover:text-accent"
                  >
                    {s.email}
                  </a>
                  <span>
                    <span className="inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {SRC_LABEL[s.source] ?? s.source}
                    </span>
                  </span>
                  <span className="text-xs text-muted">{fmtDateTime(s.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
