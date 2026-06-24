import {
  Mail,
  Users,
  Repeat,
  IndianRupee,
  Star,
  Clock,
  CalendarDays,
  CalendarClock,
  Download,
} from "lucide-react";
import { getSubscribers, getSubscriberGrowth } from "@/lib/data/subscribers";
import { getAudienceCounts } from "@/lib/data/audience";
import { SubscriberActions } from "@/components/admin/subscriber-actions";
import { SubscriberList } from "@/components/admin/subscriber-list";
import { SubscriberGrowthChart } from "@/components/admin/subscriber-growth-chart";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminSubscribersPage() {
  const [subscribers, growth, audience] = await Promise.all([
    getSubscribers(),
    getSubscriberGrowth(30),
    getAudienceCounts(),
  ]);

  const istDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const monthPrefix = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisMonth = subscribers.filter((s) => istDate(s.createdAt).startsWith(monthPrefix)).length;
  const thisWeek = subscribers.filter((s) => new Date(s.createdAt).getTime() >= weekAgo).length;

  const kpis = [
    { label: "Total subscribers", value: String(subscribers.length), icon: Mail, accent: true },
    { label: "This month", value: String(thisMonth), icon: CalendarDays },
    { label: "This week", value: String(thisWeek), icon: CalendarClock },
    { label: "Last signup", value: subscribers[0] ? fmtDate(subscribers[0].createdAt) : "—", icon: Clock, small: true },
  ];

  const segments = [
    { key: "subscribers", label: "All subscribers", count: audience.subscribers, icon: Mail },
    { key: "customers", label: "All customers", count: audience.customers, icon: Users },
    { key: "repeat", label: "Repeat buyers", count: audience.repeat, icon: Repeat },
    { key: "spent5000", label: "Spent > ₹5,000", count: audience.spent5000, icon: IndianRupee },
    { key: "highvalue", label: "High-value (₹10k+)", count: audience.highvalue, icon: Star },
    { key: "recent30", label: "Bought in 30 days", count: audience.recent30, icon: Clock },
  ];

  const emails = subscribers.map((s) => s.email);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail size={22} className="text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Newsletter signups and exportable audience segments.
          </p>
        </div>
        <a
          href="/api/admin/subscribers/export"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          download
        >
          <Download size={16} />
          Export to Excel
        </a>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
            <k.icon size={18} className={k.accent ? "text-accent" : "text-faint"} />
            <div className={`mt-3 font-bold tracking-tight ${k.small ? "text-base" : "text-xl"}`}>
              {k.value}
            </div>
            <div className="tech-label mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* growth chart */}
      <div className="mt-6">
        <SubscriberGrowthChart points={growth} />
      </div>

      {/* audience exports */}
      <div className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Audience exports</h2>
        <p className="mb-3 text-xs text-faint">
          One-click CSV for Meta/Mailchimp imports — built from subscribers, customers and orders.
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {segments.map((s) => (
            <a
              key={s.key}
              href={`/api/admin/subscribers/export?segment=${s.key}`}
              download
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <s.icon size={18} className="shrink-0 text-faint group-hover:text-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold tracking-tight">{s.count}</div>
                <div className="truncate text-xs text-muted">{s.label}</div>
              </div>
              <Download size={15} className="shrink-0 text-faint group-hover:text-accent" />
            </a>
          ))}
        </div>
      </div>

      {/* campaign helper (copy / BCC) */}
      {subscribers.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            Send a campaign from your own email — copy the list into BCC, or open your mail app
            with everyone added.
          </p>
          <SubscriberActions emails={emails} />
        </div>
      ) : null}

      {/* searchable list */}
      <div className="mt-6">
        <SubscriberList subscribers={subscribers} />
      </div>
    </div>
  );
}
