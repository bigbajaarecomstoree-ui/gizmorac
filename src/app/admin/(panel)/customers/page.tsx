import { Download, Users } from "lucide-react";
import { getCustomersWithStats } from "@/lib/data/customers";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCustomersPage() {
  const customers = await getCustomersWithStats();

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

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        {customers.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No customers have signed up yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Full name</th>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 text-center font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c, i) => {
                  const address = [c.address, c.city, c.state, c.pincode]
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={c.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3 text-faint">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.fullName}</div>
                        <div className="text-xs text-muted">{c.email}</div>
                        <div className="text-xs text-faint">Joined {fmtDate(c.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted">
                        {address || <span className="text-faint">Not provided</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{c.orderCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="readout font-semibold">{formatINR(c.totalSpent)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
