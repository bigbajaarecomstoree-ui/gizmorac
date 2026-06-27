import Link from "next/link";
import {
  IndianRupee,
  Receipt,
  Clock,
  Package,
  Users,
  TriangleAlert,
  CalendarDays,
  LifeBuoy,
  ArrowRight,
} from "lucide-react";
import {
  getAdminStats,
  getOrders,
  getSalesByWeekday,
} from "@/lib/data/orders";
import { getOpenTicketCount } from "@/lib/data/tickets";
import { getDashboardChart } from "@/lib/data/dashboard-chart";
import { getLowStockItems, getRecentStockMovements } from "@/lib/data/inventory";
import {
  bestSeller,
  customerSegments,
  revenueTrend,
  refundStats,
  getNewCustomerCount,
} from "@/lib/data/dashboard";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { SalesChart } from "@/components/admin/sales-chart";
import { DashboardCreateMenu } from "@/components/admin/dashboard-create-menu";
import {
  LowStockWidget,
  RecentMovementsWidget,
  BestSellerCard,
  CustomerSegmentsCard,
  StoreHealthCard,
} from "@/components/admin/dashboard-widgets";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, orders, byWeekday, openTickets, chart, lowStockItems, recentMovements, newCustomers] =
    await Promise.all([
      getAdminStats(),
      getOrders(),
      getSalesByWeekday(),
      getOpenTicketCount(),
      getDashboardChart(),
      getLowStockItems(),
      getRecentStockMovements(),
      getNewCustomerCount(),
    ]);
  const recent = orders.slice(0, 5);

  const topDay = [...byWeekday].sort(
    (a, b) => b.orders - a.orders || b.revenue - a.revenue,
  )[0];
  const hasSales = topDay && topDay.orders > 0;

  // Derived dashboard insights (computed from the orders already loaded).
  const best = bestSeller(orders);
  const segments = customerSegments(orders);
  const trend = revenueTrend(orders);
  const refunds = refundStats(orders);

  const cards = [
    { label: "Revenue", value: formatINR(stats.revenue), icon: IndianRupee, href: "/admin/reports", accent: true },
    { label: "Orders", value: String(stats.orderCount), icon: Receipt, href: "/admin/orders" },
    { label: "Pending", value: String(stats.pendingOrders), icon: Clock, href: "/admin/orders?status=Pending" },
    { label: "Products", value: String(stats.productCount), icon: Package, href: "/admin/products" },
    { label: "Customers", value: String(stats.customerCount), icon: Users, href: "/admin/customers" },
    { label: "Low stock", value: String(stats.lowStock), icon: TriangleAlert, href: "/admin/inventory" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Your store at a glance.</p>
        </div>
        <DashboardCreateMenu />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-2"
          >
            <c.icon
              size={18}
              className={c.accent ? "text-accent" : "text-faint group-hover:text-accent"}
            />
            <div className="mt-3 text-xl font-bold tracking-tight">{c.value}</div>
            <div className="tech-label mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* health snapshot + best seller + customers */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <StoreHealthCard
          trend={trend}
          lowStock={stats.lowStock}
          pending={stats.pendingOrders}
          refunds={refunds}
        />
        <BestSellerCard best={best} />
        <CustomerSegmentsCard
          newCount={newCustomers}
          repeat={segments.repeat}
          highRisk={segments.highRisk}
        />
      </div>

      {/* sales trend — metric + range selectable, auto-scaled axis */}
      <div className="mt-3">
        <SalesChart data={chart} />
      </div>

      {/* support tickets needing action */}
      {openTickets > 0 ? (
        <Link
          href="/admin/support"
          className="group mt-3 flex items-center gap-4 rounded-xl border border-danger/40 bg-danger/5 p-4 transition-colors hover:border-danger/60 hover:bg-danger/10"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-danger text-white">
            <LifeBuoy size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="tech-label">Support tickets to resolve</div>
            <div className="text-xl font-bold tracking-tight">
              {openTickets} open {openTickets === 1 ? "ticket" : "tickets"}
            </div>
          </div>
          <ArrowRight size={18} className="shrink-0 text-danger transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}

      {/* highest selling day — clickable, opens the day-of-week ranking */}
      <Link
        href="/admin/reports/days"
        className="group mt-3 flex items-center gap-4 rounded-xl border border-accent/30 bg-accent-soft/40 p-4 transition-colors hover:border-accent/60 hover:bg-accent-soft"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-on-accent">
          <CalendarDays size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="tech-label">Top selling day</div>
          <div className="text-xl font-bold tracking-tight">
            {hasSales ? topDay.weekday : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="readout text-lg font-bold text-accent">
            {formatINR(hasSales ? topDay.revenue : 0)}
          </div>
          <div className="tech-label">
            {hasSales ? topDay.orders : 0} {topDay && topDay.orders === 1 ? "order" : "orders"}
          </div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-accent-bright transition-transform group-hover:translate-x-0.5" />
      </Link>

      {/* inventory at a glance */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LowStockWidget items={lowStockItems} />
        <RecentMovementsWidget movements={recentMovements} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent-bright hover:text-accent"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No orders yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-medium">{o.orderNumber}</div>
                  <div className="truncate text-xs text-muted">
                    {o.firstName} {o.lastName} · {o.city}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {/* fixed columns so badges and prices line up across rows */}
                  <span className="flex w-24 justify-end">
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="readout w-20 text-right text-sm font-semibold">
                    {formatINR(o.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
