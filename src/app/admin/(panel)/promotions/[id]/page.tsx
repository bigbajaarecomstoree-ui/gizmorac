import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Ticket } from "lucide-react";
import { getCouponUsage, describeCoupon } from "@/lib/data/coupons";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { Coupon } from "@/lib/types";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOf(c: Coupon): {
  label: string;
  variant: "success" | "surface" | "danger";
} {
  const now = new Date();
  if (!c.active) return { label: "Inactive", variant: "surface" };
  if (c.expiresAt && new Date(c.expiresAt) < now)
    return { label: "Expired", variant: "danger" };
  if (c.startsAt && new Date(c.startsAt) > now)
    return { label: "Scheduled", variant: "surface" };
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit)
    return { label: "Used up", variant: "danger" };
  return { label: "Active", variant: "success" };
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="tech-label">{label}</div>
      <div
        className={`mt-1 text-lg font-bold tracking-tight ${accent ? "text-accent-bright" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

export default async function CouponDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const usage = await getCouponUsage(id);
  if (!usage) notFound();

  const { coupon, kind, issuedTo, redemptions } = usage;
  const st = statusOf(coupon);
  const usedLabel = `${coupon.usedCount}${coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/promotions"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to promotions
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Ticket size={22} className="text-accent" />
            <h1 className="font-mono text-2xl font-bold tracking-tight">{coupon.code}</h1>
            <Badge variant={st.variant}>{st.label}</Badge>
            {kind === "reward" ? <Badge variant="surface">Reward</Badge> : null}
          </div>
          {coupon.description ? (
            <p className="mt-1 text-sm text-muted">{coupon.description}</p>
          ) : null}
          {issuedTo ? (
            <p className="mt-1 text-sm text-muted">
              Issued to{" "}
              <span className="font-medium text-foreground">{issuedTo.name}</span> ·{" "}
              {issuedTo.email}
            </p>
          ) : null}
        </div>
        <Link
          href={`/admin/promotions/${coupon.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Pencil size={15} /> Edit
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Times used" value={usedLabel} accent />
        <Stat label="Offer" value={describeCoupon(coupon)} />
        <Stat label="Min order" value={coupon.minOrder ? formatINR(coupon.minOrder) : "None"} />
        <Stat label="Expires" value={fmtDate(coupon.expiresAt)} />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted">
        Redemptions{redemptions.length ? ` (${redemptions.length})` : ""}
      </h2>

      {redemptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm font-medium">No one has used this coupon yet.</p>
          <p className="mt-1 text-xs text-faint">
            Orders that redeem <span className="font-mono">{coupon.code}</span> will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 text-right font-medium">Discount</th>
                <th className="px-4 py-3 text-right font-medium">Order total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {redemptions.map((r) => (
                <tr key={r.orderId} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${r.orderId}`}
                      className="font-mono font-medium text-accent hover:underline"
                    >
                      {r.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.buyer || "—"}</div>
                    <div className="text-xs text-faint">{r.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {fmtDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-success">
                    −{formatINR(r.couponDiscount)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {formatINR(r.orderTotal)}
                  </td>
                  <td className="px-4 py-3 text-muted">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
