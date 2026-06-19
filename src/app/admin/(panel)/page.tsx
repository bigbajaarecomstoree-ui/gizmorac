import Link from "next/link";
import {
  IndianRupee,
  Receipt,
  Clock,
  Package,
  Users,
  TriangleAlert,
  CalendarDays,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  getAdminStats,
  getOrders,
  getSalesByWeekday,
} from "@/lib/data/orders";
import { formatINR } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, orders, byWeekday] = await Promise.all([
    getAdminStats(),
    getOrders(),
    getSalesByWeekday(),
  ]);
  const recent = orders.slice(0, 5);

  const topDay = [...byWeekday].sort(
    (a, b) => b.orders - a.orders || b.revenue - a.revenue,
  )[0];
  const hasSales = topDay && topDay.orders > 0;

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
        <Link href="/admin/products/new" className={buttonVariants({ size: "sm" })}>
          <Plus size={16} />
          Add product
        </Link>
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
          <div className="readout text-lg font-bold">
            {hasSales ? topDay.orders : 0}
          </div>
          <div className="tech-label">{topDay && topDay.orders === 1 ? "order" : "orders"}</div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-accent-bright transition-transform group-hover:translate-x-0.5" />
      </Link>

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
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={o.status} />
                  <span className="readout text-sm font-semibold">
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
