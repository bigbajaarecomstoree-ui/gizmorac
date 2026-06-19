import Link from "next/link";
import { LifeBuoy, ChevronRight } from "lucide-react";
import { getTickets } from "@/lib/data/tickets";
import { TicketStatusBadge } from "@/components/account/ticket-status-badge";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string }>;

const FILTERS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Awaiting proof", label: "Awaiting proof" },
  { value: "Under review", label: "Under review" },
  { value: "Resolved", label: "Resolved" },
  { value: "Rejected", label: "Rejected" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { status } = await searchParams;
  const active = (status ?? "all") as TicketStatus | "all";
  const tickets = await getTickets(active);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <LifeBuoy size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Support tickets</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Damage and defect claims raised by customers.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/support" : `/admin/support?status=${encodeURIComponent(f.value)}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active === f.value
                ? "border-accent bg-accent-soft text-accent-bright"
                : "border-border text-muted hover:border-border-bright hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
        {tickets.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No tickets{active === "all" ? " yet" : ` with status "${active}"`}.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/admin/support/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{t.ticketNumber}</span>
                    <TicketStatusBadge status={t.status} />
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                      {t.category}
                    </span>
                    {t.resolution ? (
                      <span className="text-xs font-medium text-success">{t.resolution}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{t.description}</p>
                  <p className="mt-1 text-xs text-faint">
                    {t.name || t.email} · Order {t.orderNumber} · {fmtDate(t.createdAt)}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
