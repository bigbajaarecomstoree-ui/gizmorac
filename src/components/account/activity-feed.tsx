import { History } from "lucide-react";
import type { ActivityEvent } from "@/lib/data/account";

const DOT: Record<ActivityEvent["tone"], string> = {
  neutral: "bg-muted",
  good: "bg-emerald-500",
  bad: "bg-red-500",
  warn: "bg-amber-500",
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Chronological feed of order events for the account overview. */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <History size={16} className="text-accent" /> Recent activity
      </h2>
      <ol className="relative space-y-3.5 border-l border-border pl-4">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className={`absolute -left-[1.3rem] top-1 size-2.5 rounded-full ring-2 ring-surface ${DOT[e.tone]}`} />
            <p className="text-sm">
              <span className="font-medium">{e.label}</span>
              {e.orderNumber ? <span className="font-mono text-xs text-muted"> · {e.orderNumber}</span> : null}
            </p>
            <p className="text-xs text-faint">{relative(e.createdAt)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
