import Link from "next/link";
import { ArrowLeft, CalendarDays, Trophy } from "lucide-react";
import { getSalesByWeekday } from "@/lib/data/orders";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesByDayPage() {
  const byWeekday = await getSalesByWeekday();
  // Highest selling day → lowest. Ties break on revenue.
  const ranked = [...byWeekday].sort(
    (a, b) => b.orders - a.orders || b.revenue - a.revenue,
  );
  const maxOrders = Math.max(1, ...ranked.map((d) => d.orders));
  const totalOrders = ranked.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <CalendarDays size={22} className="text-accent" />
        <h1 className="text-2xl font-bold tracking-tight">Sales by day</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Your best to worst selling days of the week, by fulfilled orders.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="hidden border-b border-border px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-faint sm:grid sm:grid-cols-[2rem_8rem_1fr_4rem_7rem]">
          <span>#</span>
          <span>Day</span>
          <span>Orders</span>
          <span className="text-right">Units</span>
          <span className="text-right">Revenue</span>
        </div>

        {totalOrders === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No fulfilled sales yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {ranked.map((d, i) => {
              const isTop = i === 0 && d.orders > 0;
              return (
                <div
                  key={d.weekday}
                  className="grid grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-1 px-5 py-3.5 sm:grid-cols-[2rem_8rem_1fr_4rem_7rem]"
                >
                  <span className="text-sm font-semibold tabular-nums text-faint">
                    {i + 1}
                  </span>

                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {d.weekday}
                    {isTop ? (
                      <Trophy size={13} className="text-accent" aria-label="Top day" />
                    ) : null}
                  </span>

                  <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(d.orders / maxOrders) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-semibold tabular-nums">
                      {d.orders}
                    </span>
                  </div>

                  <span className="hidden text-right text-sm text-muted tabular-nums sm:block">
                    {d.units}
                  </span>
                  <span className="hidden text-right text-sm font-medium tabular-nums sm:block">
                    {formatINR(d.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-faint">
        Days are computed in IST and exclude cancelled, returned and refunded orders.
      </p>
    </div>
  );
}
