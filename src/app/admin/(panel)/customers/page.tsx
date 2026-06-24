import Link from "next/link";
import { Download, Users, ChevronRight, UserCheck, Repeat, UserPlus, ShieldAlert } from "lucide-react";
import { getCustomersWithStats, isHighRiskCustomer } from "@/lib/data/customers";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLS =
  "sm:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_3.5rem_6rem_1.25rem]";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCustomersPage() {
  const customers = await getCustomersWithStats();

  // Top-line segments — keeps the module feeling alive (Total/Active/Repeat/New/Risk).
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const kpis = [
    { label: "Total", value: customers.length, icon: Users, color: "" },
    { label: "Active", value: customers.filter((c) => !c.deactivatedAt).length, icon: UserCheck, color: "text-emerald-600" },
    { label: "Repeat", value: customers.filter((c) => c.orderCount > 1).length, icon: Repeat, color: "text-accent" },
    { label: "New (30d)", value: customers.filter((c) => new Date(c.createdAt).getTime() >= since).length, icon: UserPlus, color: "text-emerald-600" },
    { label: "High risk", value: customers.filter((c) => isHighRiskCustomer(c)).length, icon: ShieldAlert, color: "text-red-600" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            {customers.length} registered customer{customers.length === 1 ? "" : "s"}.
          </p>
        </div>
        <a
          href="/api/admin/customers/export"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          download
        >
          <Download size={16} />
          Export to Excel
        </a>
      </div>

      {customers.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
              <k.icon size={18} className={cn(k.value > 0 ? k.color : "text-faint", !k.color && "text-faint")} />
              <div className={cn("mt-3 text-xl font-bold tracking-tight", k.value > 0 ? k.color : "")}>{k.value}</div>
              <div className="tech-label mt-1">{k.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        {customers.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No customers have signed up yet.
          </p>
        ) : (
          <>
            <div
              className={`hidden gap-4 border-b border-border px-4 py-3 text-xs uppercase tracking-wider text-faint sm:grid ${COLS}`}
            >
              <span>#</span>
              <span>Full name</span>
              <span>Number</span>
              <span>Address</span>
              <span className="text-center">Orders</span>
              <span className="text-right">Spent</span>
              <span />
            </div>
            <div className="divide-y divide-border">
              {customers.map((c, i) => {
                const address = [c.address, c.city, c.state, c.pincode]
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .join(", ");
                return (
                  <Link
                    key={c.id}
                    href={`/admin/customers/${c.id}`}
                    className={`grid grid-cols-1 gap-1.5 px-4 py-3 text-sm transition-colors hover:bg-surface-2 sm:items-center sm:gap-4 ${COLS}`}
                  >
                    <span className="hidden text-faint sm:block">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-accent-bright">
                          {c.fullName}
                        </span>
                        {c.deactivatedAt ? (
                          <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                            Deactivated
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">{c.email}</span>
                      <span className="block text-xs text-faint">
                        Joined {fmtDate(c.createdAt)}
                      </span>
                    </span>
                    <span className="truncate text-muted">{c.phone || "—"}</span>
                    <span className="truncate text-muted">
                      {address || <span className="text-faint">Not provided</span>}
                    </span>
                    <span className="font-medium sm:text-center">
                      <span className="text-faint sm:hidden">Orders: </span>
                      {c.orderCount}
                    </span>
                    <span className="sm:text-right">
                      <span className="readout text-base font-bold">{formatINR(c.totalSpent)}</span>
                    </span>
                    <ChevronRight size={16} className="hidden shrink-0 text-faint sm:block" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
