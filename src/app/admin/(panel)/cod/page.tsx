import Link from "next/link";
import { HandCoins } from "lucide-react";
import { getCodStats, getCodOrders } from "@/lib/data/cod-stats";
import { getCodPincodeRules } from "@/lib/data/cod-pincode";
import { CodPincodeRules } from "@/components/admin/cod-pincode-rules";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function CodManagementPage() {
  const [stats, orders, pincodeRules] = await Promise.all([
    getCodStats(),
    getCodOrders(50),
    getCodPincodeRules(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <HandCoins size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">COD &amp; RTO</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Cut RTO losses with a COD booking advance, and track delivery collection + returns.
      </p>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Total COD orders" value={String(stats.totalCodOrders)} />
        <Card label="Advance collected" value={formatINR(stats.advanceCollectedPaise / 100)} />
        <Card label="Pending collection" value={formatINR(stats.pendingCollectionPaise / 100)} hint="to collect on delivery" />
        <Card label="Delivered COD" value={String(stats.deliveredCodOrders)} />
        <Card label="RTO orders" value={String(stats.rtoOrders)} />
        <Card label="COD conversion" value={`${stats.codConversionPct}%`} hint="delivered ÷ COD" />
        <Card label="RTO rate" value={`${stats.rtoRatePct}%`} hint="RTO ÷ COD" />
        <Card label="Outstanding COD" value={formatINR(stats.outstandingCodPaise / 100)} />
      </div>

      {/* COD orders list */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-faint">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Advance</th>
              <th className="px-4 py-3 font-medium">Collect</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">RTO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">No COD orders yet.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-surface-2">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-accent hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(o.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{o.customer || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 readout">{formatINR(o.total)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{o.codAdvancePaise > 0 ? formatINR(o.codAdvancePaise / 100) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatINR((o.codAdvancePaise > 0 ? o.codRemainingPaise / 100 : o.total))}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{o.deliveryPaymentStatus || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {o.rtoStatus !== "NONE" ? <span className="text-danger">{o.rtoStatus}</span> : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* per-pincode COD rules; the advance settings live in Settings */}
      <div className="mt-8">
        <CodPincodeRules rules={pincodeRules} />
      </div>
    </div>
  );
}
