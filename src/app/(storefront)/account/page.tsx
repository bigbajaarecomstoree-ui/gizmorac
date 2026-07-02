import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Package,
  Gift,
  ShoppingBag,
  IndianRupee,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Wallet,
} from "lucide-react";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrdersForCustomer } from "@/lib/data/orders";
import { getRewardsForCustomer } from "@/lib/data/rewards";
import { getAllProducts, getBestSellers } from "@/lib/data/queries";
import { getCustomerActivity } from "@/lib/data/account";
import { formatINR } from "@/lib/format";
import { loyaltyStatus } from "@/lib/loyalty";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { RewardCouponCard } from "@/components/account/reward-coupon";
import { SecurityAlert } from "@/components/account/security-alert";
import { OrderHistoryView } from "@/components/account/order-history-view";
import { ActivityFeed } from "@/components/account/activity-feed";
import { RecommendedProducts } from "@/components/account/recommended-products";
import { RecentlyViewed } from "@/components/account/recently-viewed";
import { canCustomerCancel, isDisputeWindowOpen, warrantyClaimOpen } from "@/lib/orders-policy";
import { buttonVariants } from "@/components/ui/button";
import type { DeviceArt, Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const REWARD_PERCENT = 10;
const TERMINAL = ["Cancelled", "Returned", "Refunded"];

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", year: "numeric" });
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "GZ";
}

/** Delivery stage 1–4 + whether to show the tracker, from order status. */
function shipmentStage(status: string, shipmentStatus: string): { stage: number; show: boolean } {
  if (TERMINAL.includes(status)) return { stage: 0, show: false };
  if (status === "Delivered") return { stage: 4, show: true };
  if (status === "Shipped") {
    return { stage: shipmentStatus.toLowerCase().includes("out for delivery") ? 3 : 2, show: true };
  }
  return { stage: 1, show: true };
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const [orders, rewards, products, bestSellers] = await Promise.all([
    getOrdersForCustomer(customer.id, customer.email),
    getRewardsForCustomer(customer.id),
    getAllProducts(),
    getBestSellers(8),
  ]);
  const activeRewards = rewards.filter((r) => !r.used && !r.expired);
  const artById = new Map<string, DeviceArt>(products.map((p) => [p.id, p.art]));
  const imageById = new Map<string, string | null>(products.map((p) => [p.id, p.image ?? null]));
  const warrantyById = new Map<string, number>(products.map((p) => [p.id, p.warrantyMonths]));

  const activity = await getCustomerActivity(
    orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt })),
  );

  // Overview figures.
  const firstName = customer.fullName.trim().split(/\s+/)[0] || "there";
  // "Total spent" counts money that actually moved: delivered/replacement
  // orders (COD collected, prepaid fulfilled) plus paid-online orders still in
  // transit — never unpaid Pending/Confirmed COD, never reversed orders.
  const totalSpent = orders
    .filter(
      (o) =>
        !TERMINAL.includes(o.status) &&
        (o.status === "Delivered" ||
          o.status === "Replacement" ||
          o.paymentStatus === "Paid"),
    )
    .reduce((s, o) => s + o.total, 0);
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
  const returnedCount = orders.filter((o) => o.status === "Returned").length;
  const cancelledCount = orders.filter((o) => o.status === "Cancelled").length;

  // Loyalty: gamified tier + milestone reward progress.
  const tier = loyaltyStatus(deliveredCount);
  const nextMilestone = deliveredCount < 1 ? 1 : (Math.floor(deliveredCount / 5) + 1) * 5;
  const remaining = nextMilestone - deliveredCount;

  // Recommendations: same categories as purchased products, topped up with best sellers.
  const purchasedIds = new Set(orders.flatMap((o) => o.items.map((i) => i.id)));
  const purchasedCats = new Set(
    products.filter((p) => purchasedIds.has(p.id)).map((p) => p.category),
  );
  const recommended: Product[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    if (recommended.length >= 4) break;
    if (p.active && p.stock > 0 && !purchasedIds.has(p.id) && purchasedCats.has(p.category)) {
      recommended.push(p);
      seen.add(p.id);
    }
  }
  for (const p of bestSellers) {
    if (recommended.length >= 4) break;
    if (!seen.has(p.id) && !purchasedIds.has(p.id)) {
      recommended.push(p);
      seen.add(p.id);
    }
  }

  const stats = [
    { icon: ShoppingBag, label: "Orders", value: String(orders.length) },
    { icon: IndianRupee, label: "Total spent", value: formatINR(totalSpent) },
    { icon: Gift, label: "Active rewards", value: String(activeRewards.length), accent: true },
    { icon: CalendarDays, label: "Member since", value: fmtMonthYear(customer.createdAt) },
  ];

  const delivery = [
    { label: "Delivered", value: deliveredCount, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Returned", value: returnedCount, icon: RotateCcw, color: "text-amber-600" },
    { label: "Cancelled", value: cancelledCount, icon: XCircle, color: "text-red-600" },
  ];

  return (
    <div className="shell py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "My account" }]} />

      {/* welcome header */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-on-accent">
          {initials(customer.fullName)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {firstName} 👋</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft/60 px-2.5 py-1 text-xs font-semibold">
              {tier.current.emoji} {tier.current.name} member
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{customer.email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <AccountSidebar />

        <div className="min-w-0 space-y-6">
          {/* overview tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
                <s.icon size={18} className={s.accent ? "text-accent" : "text-faint"} />
                <div className="mt-3 text-xl font-bold tracking-tight">{s.value}</div>
                <div className="tech-label mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* delivery breakdown */}
          {orders.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {delivery.map((d) => (
                <div key={d.label} className="rounded-xl border border-border bg-surface p-4">
                  <d.icon size={16} className={d.color} />
                  <div className={`mt-2 text-lg font-bold ${d.value > 0 ? d.color : ""}`}>{d.value}</div>
                  <div className="tech-label mt-0.5">{d.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          {/* loyalty tier progress */}
          <div className="overflow-hidden rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                <h2 className="font-semibold">
                  {tier.current.emoji} {tier.current.name} member
                </h2>
              </div>
              {tier.next ? (
                <span className="text-xs font-medium text-muted">
                  Next: {tier.next.emoji} {tier.next.name}
                </span>
              ) : (
                <span className="text-xs font-semibold text-accent-bright">Top tier reached 🎉</span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">
              {deliveredCount === 0 ? (
                <>
                  Place your first order to unlock{" "}
                  <span className="font-semibold text-foreground">{REWARD_PERCENT}% off</span>.
                </>
              ) : (
                <>
                  Just{" "}
                  <span className="font-semibold text-foreground">
                    {remaining} more order{remaining === 1 ? "" : "s"}
                  </span>{" "}
                  to your next {REWARD_PERCENT}% reward
                  {tier.next ? <> · {tier.toNext} to {tier.next.name}</> : null}.
                </>
              )}
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${tier.pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-faint">
              Tiers: 🥉 Bronze → 🥈 Silver (5) → 🥇 Gold (10) → 💎 Platinum (20). Delivered orders count.
            </p>
          </div>

          {/* security */}
          <SecurityAlert />

          {/* rewards wallet */}
          <section id="rewards" className="scroll-mt-24 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-accent" />
              <h2 className="font-semibold">Rewards wallet</h2>
            </div>
            {activeRewards.length > 0 ? (
              <>
                <p className="mt-1.5 text-sm text-muted">
                  <span className="font-semibold text-foreground">{activeRewards.length}</span> active
                  coupon{activeRewards.length === 1 ? "" : "s"} · {REWARD_PERCENT}% off each (up to ₹500) ·
                  next reward in {remaining} order{remaining === 1 ? "" : "s"}.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {activeRewards.map((r) => (
                    <RewardCouponCard key={r.code} {...r} />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-muted">
                No rewards yet — you earn a {REWARD_PERCENT}% coupon on your 1st delivered order, then
                every 5th. {deliveredCount > 0 ? `Next reward in ${remaining} order${remaining === 1 ? "" : "s"}.` : ""}
              </p>
            )}
          </section>

          {/* order history */}
          <section id="orders" className="min-w-0 scroll-mt-24">
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
                rows={orders.map((o) => {
                  const ship = shipmentStage(o.status, o.shipmentStatus);
                  return {
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
                      image: imageById.get(i.id) ?? null,
                    })),
                    canCancel: canCustomerCancel(o.status, o.createdAt),
                    canDispute: isDisputeWindowOpen(o.status, o.deliveredAt),
                    canWarranty: warrantyClaimOpen(
                      o.status,
                      o.deliveredAt,
                      Math.max(0, ...o.items.map((i) => warrantyById.get(i.id) ?? 0)),
                    ),
                    trackLabel: o.status === "Delivered" ? "View order" : "Track order",
                    stage: ship.stage,
                    showProgress: ship.show,
                  };
                })}
              />
            )}
          </section>

          {/* recent activity */}
          <ActivityFeed events={activity} />

          {/* recommendations */}
          <RecommendedProducts
            title="Recommended for you"
            subtitle={purchasedCats.size > 0 ? "Based on what you've ordered." : "Popular right now."}
            products={recommended}
          />

          {/* recently viewed (client, from localStorage) */}
          <RecentlyViewed limit={6} />
        </div>
      </div>
    </div>
  );
}
