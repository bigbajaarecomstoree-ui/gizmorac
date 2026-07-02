import Link from "next/link";
import { ScrollText, AlertTriangle, Info, TriangleAlert, Search } from "lucide-react";
import { getLogs, type LogLevel, type LogActor } from "@/lib/data/logs";
import { AdminSubnav } from "@/components/admin/admin-subnav";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  level?: string;
  actor?: string;
  q?: string;
  page?: string;
}>;

const LEVELS: (LogLevel | "all")[] = ["all", "info", "warn", "error"];
const ACTORS: (LogActor | "all")[] = ["all", "customer", "admin", "system"];
const PAGE_SIZE = 50;

function fmt(iso: Date): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    error: "bg-danger/15 text-danger",
    warn: "bg-accent/15 text-accent-bright",
    info: "bg-success/15 text-success",
  };
  const Icon = level === "error" ? AlertTriangle : level === "warn" ? TriangleAlert : Info;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${map[level] ?? "bg-border-bright/40 text-muted"}`}
    >
      <Icon size={11} /> {level}
    </span>
  );
}

export default async function LogsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const level = (LEVELS.includes(sp.level as LogLevel) ? sp.level : "all") as LogLevel | "all";
  const actor = (ACTORS.includes(sp.actor as LogActor) ? sp.actor : "all") as LogActor | "all";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await getLogs({
    level,
    actor,
    q,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (level !== "all") p.set("level", level);
    if (actor !== "all") p.set("actor", actor);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === "all") p.delete(k);
      else p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/admin/logs?${s}` : "/admin/logs";
  };

  return (
    <div className="mx-auto max-w-5xl">
      <AdminSubnav tabs={[{ label: "Settings", href: "/admin/settings" }, { label: "Logs", href: "/admin/logs" }]} />
      <div className="flex items-center gap-2">
        <ScrollText size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Activity &amp; error log — trace what customers and admins did, and any
        errors, to diagnose issues. {total.toLocaleString("en-IN")} events.
      </p>

      {/* filters — single GET form bar */}
      <form
        method="get"
        action="/admin/logs"
        className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-3"
      >
        <label className="flex flex-col gap-1">
          <span className="tech-label">Level</span>
          <select name="level" defaultValue={level} className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none">
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="tech-label">Who</span>
          <select name="actor" defaultValue={actor} className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-accent focus:outline-none">
            {ACTORS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "12rem" }}>
          <span className="tech-label">Search</span>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              name="q"
              defaultValue={q}
              placeholder="email, order number, action…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover">
          Filter
        </button>
        {(level !== "all" || actor !== "all" || q) ? (
          <Link href="/admin/logs" className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted transition-colors hover:text-foreground">
            Reset
          </Link>
        ) : null}
      </form>

      {/* list */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No log entries match these filters.</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <LevelBadge level={r.level} />
                  <span className="font-mono text-xs font-medium text-foreground">{r.action}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.7rem] text-muted">{r.actor}</span>
                  <span className="ml-auto text-xs text-faint">{fmt(r.createdAt)}</span>
                </div>
                {r.message ? <p className="mt-1.5 text-foreground">{r.message}</p> : null}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-faint">
                  {r.actorEmail ? <span>{r.actorEmail}</span> : null}
                  {r.ip ? <span>IP {r.ip}</span> : null}
                  {r.path ? <span className="font-mono">{r.path}</span> : null}
                </div>
                {r.meta && r.meta !== "{}" ? (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-xs text-muted hover:text-accent">details</summary>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-background p-2 text-[0.7rem] leading-relaxed text-muted">{r.meta}</pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* pagination */}
      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={qs({ page: page - 1 })} className="rounded-lg border border-border px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-accent">← Newer</Link>
          ) : <span />}
          <span className="text-faint">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={qs({ page: page + 1 })} className="rounded-lg border border-border px-3 py-1.5 text-muted transition-colors hover:border-accent hover:text-accent">Older →</Link>
          ) : <span />}
        </div>
      ) : null}
    </div>
  );
}
