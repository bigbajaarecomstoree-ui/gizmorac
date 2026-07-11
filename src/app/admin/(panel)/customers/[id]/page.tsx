import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  CalendarClock,
  Receipt,
  IndianRupee,
  Package,
  ChevronRight,
  TrendingUp,
  Users,
  ShieldAlert,
  Crown,
  Repeat,
  History,
} from "lucide-react";
import {
  getCustomerById,
  getCustomerTimeline,
  isHighRiskCustomer,
  isVipCustomer,
  isCodRiskCustomer,
} from "@/lib/data/customers";
import { getAddressesForCustomer } from "@/lib/data/addresses";
import { getOrdersForCustomer } from "@/lib/data/orders";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { CustomerStatusActions } from "@/components/admin/customer-status-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const NON_REVENUE = ["Cancelled", "Returned", "Refunded"];

const ACTION =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent";

const DOT: Record<string, string> = {
  created: "bg-accent",
  placed: "bg-blue-500",
  progress: "bg-sky-500",
  good: "bg-emerald-500",
  bad: "bg-red-500",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CustomerDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  // Admin view intentionally includes email-matched (guest) orders for a full
  // customer history; the storefront self-view stays strict (customerId only).
  const orders = await getOrdersForCustomer(customer.id, customer.email, { matchEmail: true });
  const addresses = await getAddressesForCustomer(customer.id);

  const totalSpent = orders
    .filter((o) => !NON_REVENUE.includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const itemsBought = orders
    .filter((o) => !NON_REVENUE.includes(o.status))
    .reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);
  const lastOrder = orders[0]; // getOrdersForCustomer returns newest first

  // Profile address, falling back to the most recent order's shipping address.
  const profileAddr = [customer.address, customer.city, customer.state, customer.pincode]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
  const fallbackAddr = lastOrder
    ? [lastOrder.address, lastOrder.city, lastOrder.state, lastOrder.pincode]
        .filter(Boolean)
        .join(", ")
    : "";
  const address = profileAddr || fallbackAddr;
  const phone = customer.phone || lastOrder?.phone || "";
  const wa = phone ? `https://wa.me/91${phone.replace(/\D/g, "").slice(-10)}` : "";

  // Risk / value signals (same rules as the customer list).
  const cancels = orders.filter((o) => o.status === "Cancelled").length;
  const returns = orders.filter((o) => o.status === "Returned" || o.status === "Refunded").length;
  const codOrders = orders.filter((o) => o.paymentMethod !== "PhonePe").length;
  const signals = { orderCount: orders.length, totalSpent, cancels, returns, codOrders };
  const vip = isVipCustomer(signals);
  const highRisk = isHighRiskCustomer(signals);
  const codRisk = isCodRiskCustomer(signals);
  const repeat = orders.length > 1;

  const revenueOrders = orders.filter((o) => !NON_REVENUE.includes(o.status));
  const aov = revenueOrders.length ? Math.round(totalSpent / revenueOrders.length) : 0;

  // Lifetime profit = revenue − product cost across fulfilled orders.
  const itemIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.id)))];
  const costRows = itemIds.length
    ? await prisma.product.findMany({ where: { id: { in: itemIds } }, select: { id: true, cost: true } })
    : [];
  const costById = new Map(costRows.map((p) => [p.id, p.cost]));
  const cogs = revenueOrders.reduce(
    (s, o) => s + o.items.reduce((n, it) => n + (costById.get(it.id) ?? 0) * it.qty, 0),
    0,
  );
  const profit = totalSpent - cogs;
  const margin = totalSpent ? Math.round((profit / totalSpent) * 100) : 0;
  const marginColor =
    cogs === 0 ? "text-muted" : margin < 10 ? "text-red-600" : margin < 20 ? "text-amber-600" : "text-emerald-600";

  const timeline = await getCustomerTimeline(
    customer.createdAt,
    orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt })),
  );

  const stats = [
    { label: "Total orders", value: String(orders.length), icon: Receipt },
    { label: "Total spent", value: formatINR(totalSpent), icon: IndianRupee, accent: true },
    { label: "Items bought", value: String(itemsBought), icon: Package },
    {
      label: "Last order",
      value: lastOrder ? fmtDateTime(lastOrder.createdAt) : "—",
      icon: CalendarClock,
      small: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to customers
      </Link>

      {/* identity */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{customer.fullName}</h1>
              {customer.deactivatedAt ? (
                <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
                  Deactivated
                </span>
              ) : (
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  Active
                </span>
              )}
              {vip ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                  <Crown size={12} /> VIP
                </span>
              ) : null}
              {repeat ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  <Repeat size={12} /> Repeat
                </span>
              ) : null}
              {highRisk ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                  <ShieldAlert size={12} /> High risk
                </span>
              ) : null}
              {codRisk ? (
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">
                  COD-reliant
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-faint">
              Customer since {fmtDateTime(customer.createdAt)}
              {customer.deactivatedAt
                ? ` · deactivated ${fmtDateTime(customer.deactivatedAt)}`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <a href={`mailto:${customer.email}`} className={ACTION}>
                <Mail size={15} /> Email
              </a>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={ACTION}>
                  <MessageCircle size={15} /> WhatsApp
                </a>
              ) : null}
              {phone ? (
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className={ACTION}>
                  <Phone size={15} /> Call
                </a>
              ) : null}
            </div>
            <CustomerStatusActions id={customer.id} deactivated={Boolean(customer.deactivatedAt)} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <a href={`mailto:${customer.email}`} className="flex items-center gap-2.5 text-muted transition-colors hover:text-accent">
            <Mail size={16} className="shrink-0 text-accent" />
            {customer.email}
          </a>
          {phone ? (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="flex items-center gap-2.5 text-muted transition-colors hover:text-accent">
              <Phone size={16} className="shrink-0 text-accent" />
              {phone}
            </a>
          ) : null}
          <div className="flex items-start gap-2.5 text-muted sm:col-span-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
            {address || <span className="text-faint">No address on file</span>}
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <s.icon size={18} className={s.accent ? "text-accent" : "text-faint"} />
            <div
              className={cn(
                "mt-3 font-bold tracking-tight",
                s.small ? "text-sm" : s.accent ? "readout text-2xl text-accent" : "text-xl",
              )}
            >
              {s.value}
            </div>
            <div className="tech-label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* lifetime value + profit */}
      {orders.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Users size={16} className="text-accent" /> Lifetime
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-2 px-2 py-3">
                <div className="text-lg font-bold">{orders.length}</div>
                <div className="tech-label">Orders</div>
              </div>
              <div className="rounded-lg bg-surface-2 px-2 py-3">
                <div className="readout text-lg font-bold text-accent">{formatINR(totalSpent)}</div>
                <div className="tech-label">Spent</div>
              </div>
              <div className="rounded-lg bg-surface-2 px-2 py-3">
                <div className="readout text-lg font-bold">{formatINR(aov)}</div>
                <div className="tech-label">AOV</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{cancels} cancelled</span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{returns} returned</span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{codOrders} COD</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp size={16} className="text-accent" /> Profit
              <span className="text-xs font-normal text-faint">· internal</span>
            </h2>
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted">Spent</dt>
                <dd>{formatINR(totalSpent)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Product cost</dt>
                <dd>−{formatINR(cogs)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <dt>Profit</dt>
                <dd className={marginColor}>
                  {formatINR(profit)} · {margin}%
                </dd>
              </div>
            </dl>
            {cogs === 0 ? (
              <p className="mt-2 text-xs text-faint">Set product costs in Products to see true margin.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* activity timeline */}
      {timeline.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
          <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 font-semibold">
            <History size={16} className="text-accent" /> Activity timeline
          </h2>
          <ol className="relative ml-5 border-l border-border py-2">
            {timeline.map((e) => (
              <li key={e.id} className="relative py-2 pl-6 pr-5">
                <span className={cn("absolute -left-[5px] top-3.5 size-2.5 rounded-full ring-2 ring-surface", DOT[e.kind])} />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {e.label}
                    {e.order ? <span className="ml-1.5 font-mono text-xs text-muted">{e.order}</span> : null}
                  </span>
                  <span className="text-xs text-faint">{fmtDateTime(e.at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* saved addresses — the customer's address book */}
      {addresses.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-4 font-semibold">
            Saved addresses ({addresses.length})
          </h2>
          <div className="divide-y divide-border">
            {addresses.map((a) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin size={15} className="shrink-0 text-accent" />
                  <span className="text-sm font-semibold">{a.fullName}</span>
                  {a.label ? (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {a.label}
                    </span>
                  ) : null}
                  {a.isDefault ? (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-muted">
                  {a.line1}, {a.city}, {a.state} — {a.pincode}
                </p>
                <p className="text-xs text-faint">{a.phone}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* order history */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          Order history ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <Receipt size={28} className="text-faint" />
            <p className="mt-3 text-sm font-medium text-muted">No orders yet</p>
            <p className="mt-1 text-xs text-faint">
              This customer signed up but hasn&apos;t placed an order.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((o) => {
              const itemSummary = o.items
                .map((i) => `${i.name} ×${i.qty}`)
                .join(", ");
              return (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-xs text-faint">{fmtDateTime(o.createdAt)}</p>
                    <p className="mt-1 truncate text-sm text-muted">{itemSummary}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="readout text-base font-bold">{formatINR(o.total)}</div>
                    <div className="text-xs text-faint">
                      {o.items.reduce((n, i) => n + i.qty, 0)} item
                      {o.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-faint" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
