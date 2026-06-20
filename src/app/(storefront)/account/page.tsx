import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Package, ChevronRight } from "lucide-react";
import { Gift } from "lucide-react";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrdersForCustomer } from "@/lib/data/orders";
import { getRewardsForCustomer } from "@/lib/data/rewards";
import { logoutAction } from "@/lib/customer/actions";
import { formatINR } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { ProfileForm } from "@/components/account/profile-form";
import { RewardCouponCard } from "@/components/account/reward-coupon";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const [orders, rewards] = await Promise.all([
    getOrdersForCustomer(customer.id, customer.email),
    getRewardsForCustomer(customer.id),
  ]);
  const activeRewards = rewards.filter((r) => !r.used && !r.expired);

  return (
    <div className="shell py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My account" }]} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My account</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as <span className="font-medium text-foreground">{customer.email}</span>
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger cursor-pointer"
          >
            <LogOut size={16} /> Log out
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* order history */}
        <section>
          <h2 className="text-lg font-semibold">Order history</h2>
          {orders.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
              <Package size={32} className="text-faint" />
              <p className="mt-3 text-sm text-muted">You haven&apos;t placed any orders yet.</p>
              <Link href="/shop" className={`${buttonVariants({ size: "sm" })} mt-5`}>
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
              <div className="divide-y divide-border">
                {orders.map((o) => {
                  const count = o.items.reduce((n, i) => n + i.qty, 0);
                  return (
                    <Link
                      key={o.id}
                      href={`/order/${o.orderNumber}`}
                      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                          <OrderStatusBadge status={o.status} />
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {fmtDate(o.createdAt)} · {count} item{count === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span className="readout text-sm font-semibold">{formatINR(o.total)}</span>
                      <ChevronRight size={16} className="text-faint" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* rewards + profile */}
        <section className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          {activeRewards.length > 0 ? (
            <div>
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-accent" />
                <h2 className="text-lg font-semibold">Your rewards</h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                Repeat-order coupons — apply the code at checkout.
              </p>
              <div className="mt-4 space-y-3">
                {activeRewards.map((r) => (
                  <RewardCouponCard key={r.code} {...r} />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="text-lg font-semibold">Profile &amp; address</h2>
            <p className="mt-1 text-sm text-muted">
              Saved details speed up checkout.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <ProfileForm customer={customer} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
