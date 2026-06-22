import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  Receipt,
  IndianRupee,
  Package,
  ChevronRight,
} from "lucide-react";
import { getCustomerById } from "@/lib/data/customers";
import { getAddressesForCustomer } from "@/lib/data/addresses";
import { getOrdersForCustomer } from "@/lib/data/orders";
import { formatINR } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { CustomerStatusActions } from "@/components/admin/customer-status-actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const NON_REVENUE = ["Cancelled", "Returned", "Refunded"];

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

  const orders = await getOrdersForCustomer(customer.id, customer.email);
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
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
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
            </div>
            <p className="mt-1 text-sm text-faint">
              Customer since {fmtDateTime(customer.createdAt)}
              {customer.deactivatedAt
                ? ` · deactivated ${fmtDateTime(customer.deactivatedAt)}`
                : ""}
            </p>
          </div>
          <CustomerStatusActions id={customer.id} deactivated={Boolean(customer.deactivatedAt)} />
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
            <div className={`mt-3 font-bold tracking-tight ${s.small ? "text-sm" : "text-xl"}`}>
              {s.value}
            </div>
            <div className="tech-label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

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
                    <div className="readout font-semibold">{formatINR(o.total)}</div>
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
