import Link from "next/link";
import { Plus, Ticket, Pencil } from "lucide-react";
import { getCoupons, describeCoupon } from "@/lib/data/coupons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeleteCouponButton } from "@/components/admin/delete-coupon-button";

export const dynamic = "force-dynamic";

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusOf(c: {
  active: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit: number;
  usedCount: number;
}): { label: string; variant: "success" | "surface" | "danger" } {
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

export default async function PromotionsPage() {
  const coupons = await getCoupons();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Ticket size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Coupons, percentage deals and buy-one-get-one offers.
          </p>
        </div>
        <Link href="/admin/promotions/new" className={buttonVariants({ size: "sm" })}>
          <Plus size={16} />
          New coupon
        </Link>
      </div>

      {coupons.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Ticket size={32} className="text-faint" />
          <h2 className="mt-3 text-lg font-semibold">No coupons yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Create your first coupon to offer percentage discounts, flat savings
            or buy-one-get-one deals at checkout.
          </p>
          <Link href="/admin/promotions/new" className={`${buttonVariants()} mt-5`}>
            <Plus size={16} /> Create coupon
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Offer</th>
                  <th className="px-4 py-3 font-medium">Min order</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => {
                  const st = statusOf(c);
                  return (
                    <tr key={c.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/promotions/${c.id}`}
                          className="font-mono font-semibold text-foreground hover:text-accent hover:underline"
                        >
                          {c.code}
                        </Link>
                        {c.description ? (
                          <div className="text-xs text-faint">{c.description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">{describeCoupon(c)}</td>
                      <td className="px-4 py-3 text-muted">
                        {c.minOrder ? `₹${c.minOrder}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {c.usedCount}
                        {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-muted">{fmtDate(c.expiresAt) ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/promotions/${c.id}/edit`}
                            className="inline-grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                            aria-label={`Edit ${c.code}`}
                          >
                            <Pencil size={15} />
                          </Link>
                          <DeleteCouponButton id={c.id} code={c.code} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
