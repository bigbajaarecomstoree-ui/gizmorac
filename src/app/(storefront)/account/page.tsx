import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LogOut,
  Package,
  Gift,
  ShoppingBag,
  IndianRupee,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrdersForCustomer } from "@/lib/data/orders";
import { getRewardsForCustomer } from "@/lib/data/rewards";
import { getAllProducts } from "@/lib/data/queries";
import { logoutAction } from "@/lib/customer/actions";
import { formatINR } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AccountNav } from "@/components/account/account-nav";
import { RewardCouponCard } from "@/components/account/reward-coupon";
import { SecurityAlert } from "@/components/account/security-alert";
import { OrderHistoryView } from "@/components/account/order-history-view";
import { canCancelOrder, isDisputeWindowOpen, warrantyClaimOpen } from "@/lib/orders-policy";
import { buttonVariants } from "@/components/ui/button";
import type { DeviceArt } from "@/lib/types";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const REWARD_PERCENT = 10;
const TERMINAL = ["Cancelled", "Returned", "Refunded"];

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    year: "numeric",
  });
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "GZ";
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const [orders, rewards, products] = await Promise.all([
    getOrdersForCustomer(customer.id, customer.email),
    getRewardsForCustomer(customer.id),
    getAllProducts(),
  ]);
  const activeRewards = rewards.filter((r) => !r.used && !r.expired);
  const artById = new Map<string, DeviceArt>(products.map((p) => [p.id, p.art]));
  const warrantyById = new Map<string, number>(products.map((p) => [p.id, p.warrantyMonths]));

  // Overview figures.
  const firstName = customer.fullName.trim().split(/\s+/)[0] || "there";
  const totalSpent = orders
    .filter((o) => !TERMINAL.includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  // Loyalty progress toward the next milestone reward (1st, then every 5th).
  const nextMilestone =
    deliveredCount < 1 ? 1 : (Math.floor(deliveredCount / 5) + 1) * 5;
  const prevMilestone =
    deliveredCount >= 5
      ? Math.floor(deliveredCount / 5) * 5
      : deliveredCount >= 1
        ? 1
        : 0;
  const remaining = nextMilestone - deliveredCount;
  const segTotal = nextMilestone - prevMilestone || 1;
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round(((deliveredCount - prevMilestone) / segTotal) * 100)),
  );

  const stats = [
    { icon: ShoppingBag, label: "Orders", value: String(orders.length) },
    { icon: IndianRupee, label: "Total spent", value: formatINR(totalSpent) },
    {
      icon: Gift,
      label: "Active rewards",
      value: String(activeRewards.length),
      accent: true,
    },
    { icon: CalendarDays, label: "Member since", value: fmtMonthYear(customer.createdAt) },
  ];

  return (
    <div className="shell py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My account" }]} />

      {/* welcome header */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-on-accent">
            {initials(customer.fullName)}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hi, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted">{customer.email}</p>
          </div>
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

      <div className="mt-6 sm:max-w-sm">
        <AccountNav />
      </div>

      {/* overview tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <s.icon size={18} className={s.accent ? "text-accent" : "text-faint"} />
            <div className="mt-3 text-xl font-bold tracking-tight">{s.value}</div>
            <div className="tech-label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* loyalty progress */}
      <div className="mt-3 overflow-hidden rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="font-semibold">Loyalty rewards</h2>
        </div>
        {deliveredCount === 0 ? (
          <p className="mt-1.5 text-sm text-muted">
            Place your first order to unlock{" "}
            <span className="font-semibold text-foreground">{REWARD_PERCENT}% off</span>{" "}
            your next purchase.
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-muted">
            Just{" "}
            <span className="font-semibold text-foreground">
              {remaining} more order{remaining === 1 ? "" : "s"}
            </span>{" "}
            to your next {REWARD_PERCENT}% reward.
          </p>
        )}
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-faint">
          You earn a reward on your 1st order, then every 5th — delivered orders count.
        </p>
        {activeRewards.length > 0 ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent-bright">
            <Gift size={15} /> You have {activeRewards.length} reward
            {activeRewards.length === 1 ? "" : "s"} ready — apply at checkout.
          </p>
        ) : null}
      </div>

      {/* anti-fraud notice for the orders area */}
      <div className="mt-8">
        <SecurityAlert />
      </div>

      <div className="mt-6 space-y-8">
        {/* order history */}
        <section className="min-w-0">
          <h2 className="text-lg font-semibold">Order history</h2>
          {orders.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
              <Package size={32} className="text-faint" />
              <p className="mt-3 text-sm font-medium">No orders yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                When you place an order, you can track it and reorder it from here.
              </p>
              <Link href="/shop" className={`${buttonVariants({ size: "sm" })} mt-5`}>
                Start shopping
              </Link>
            </div>
          ) : (
            <OrderHistoryView
              rows={orders.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status,
                createdAt: o.createdAt,
                paymentLabel: o.paymentMethod === "PhonePe" ? "Prepaid" : "COD",
                total: o.total,
                address: [o.city, o.state].filter(Boolean).join(", "),
                itemsSummary: o.items[0]
                  ? `${o.items[0].name}${o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}`
                  : "—",
                count: o.items.reduce((n, i) => n + i.qty, 0),
                items: o.items.map((i) => ({
                  id: i.id,
                  qty: i.qty,
                  art: artById.get(i.id) ?? ("printer" as DeviceArt),
                })),
                canCancel: canCancelOrder(o.status),
                canDispute: isDisputeWindowOpen(o.status, o.deliveredAt),
                canWarranty: warrantyClaimOpen(
                  o.status,
                  o.deliveredAt,
                  Math.max(0, ...o.items.map((i) => warrantyById.get(i.id) ?? 0)),
                ),
                trackLabel: o.status === "Delivered" ? "View order" : "Track order",
              }))}
            />
          )}
        </section>

        {/* rewards */}
        {activeRewards.length > 0 ? (
          <section>
            <div className="flex items-center gap-2">
              <Gift size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Your rewards</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Repeat-order coupons — apply the code at checkout.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeRewards.map((r) => (
                <RewardCouponCard key={r.code} {...r} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
