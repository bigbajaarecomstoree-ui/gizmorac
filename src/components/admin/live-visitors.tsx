"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const POLL_MS = 15_000;

/**
 * Polls the owner-only presence endpoint and returns the live visitor count
 * (null until the first successful load). Keeps the last known value across
 * transient errors and pauses polling while the tab is hidden.
 */
function useLiveVisitors(): number | null {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/presence", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && typeof data.count === "number") setCount(data.count);
      } catch {
        // Keep the last known value on a transient failure.
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return count;
}

/** Pulsing status dot — green when someone is online, faint when nobody is. */
function LiveDot({ online, size = "sm" }: { online: boolean; size?: "sm" | "md" }) {
  const dot = size === "md" ? "h-3 w-3" : "h-2 w-2";
  return (
    <span className={cn("relative flex", dot)}>
      {online ? (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75 motion-reduce:animate-none" />
      ) : null}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          dot,
          online ? "bg-success" : "bg-faint",
        )}
      />
    </span>
  );
}

/** Compact badge for the admin sidebar — persistent across every admin page. */
export function LiveVisitorsBadge() {
  const count = useLiveVisitors();
  const online = (count ?? 0) > 0;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <LiveDot online={online} />
      <span className="text-sm font-semibold tabular-nums">{count ?? "—"}</span>
      <span className="tech-label">online now</span>
    </div>
  );
}

/** Prominent "live view" strip for the dashboard. */
export function LiveVisitorsCard() {
  const count = useLiveVisitors();
  const online = count ?? 0;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-success/30 bg-success/5 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-success/10">
        <LiveDot online={online > 0} size="md" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="tech-label">Live right now</div>
        <div className="text-xl font-bold tracking-tight">
          {count === null ? "—" : `${online} ${online === 1 ? "visitor" : "visitors"}`}
        </div>
      </div>
      <span className="tech-label hidden sm:block">on your store</span>
    </div>
  );
}
