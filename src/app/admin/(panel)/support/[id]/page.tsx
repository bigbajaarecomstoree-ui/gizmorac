import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Receipt,
  Mail,
  Phone,
  BadgeCheck,
  XCircle,
  RotateCcw,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { getTicketById } from "@/lib/data/tickets";
import { getOrderById } from "@/lib/data/orders";
import { resolveTicket } from "@/lib/admin/actions";
import { TicketStatusBadge } from "@/components/account/ticket-status-badge";
import { TicketThread } from "@/components/account/ticket-thread";
import { AdminTicketReply } from "@/components/admin/ticket-reply";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DECISIONS = [
  { value: "Refund", label: "Approve refund", icon: RotateCcw },
  { value: "Replacement", label: "Approve replacement", icon: Repeat },
  { value: "Warranty", label: "Approve warranty", icon: ShieldCheck },
];

export default async function AdminTicketDetail({ params }: { params: Params }) {
  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const order = await getOrderById(ticket.orderId);
  const closed = ticket.status === "Resolved" || ticket.status === "Rejected";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to tickets
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-tight">{ticket.ticketNumber}</h1>
        <TicketStatusBadge status={ticket.status} />
        <span className="rounded bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
          {ticket.category}
        </span>
        {ticket.resolution ? (
          <span className="text-sm font-semibold text-success">
            Outcome: {ticket.resolution}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">Raised {fmtDate(ticket.createdAt)}</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        {/* conversation + reply */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-semibold">Conversation</h2>
            <TicketThread messages={ticket.messages} />
          </div>

          {!closed ? <AdminTicketReply ticketId={ticket.id} /> : (
            <p className="rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted">
              This ticket is closed ({ticket.status.toLowerCase()}).
            </p>
          )}
        </div>

        {/* customer + decision */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-3 font-semibold">Customer &amp; order</h2>
            <p className="font-medium">{ticket.name || "—"}</p>
            <a
              href={`mailto:${ticket.email}`}
              className="mt-1 flex items-center gap-2 text-muted transition-colors hover:text-accent"
            >
              <Mail size={14} className="shrink-0 text-accent" /> {ticket.email}
            </a>
            {order?.phone ? (
              <a
                href={`tel:${order.phone.replace(/\s+/g, "")}`}
                className="mt-1 flex items-center gap-2 text-muted transition-colors hover:text-accent"
              >
                <Phone size={14} className="shrink-0 text-accent" /> {order.phone}
              </a>
            ) : null}
            <Link
              href={`/admin/orders/${ticket.orderId}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border-bright px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
            >
              <Receipt size={14} /> Order {ticket.orderNumber}
            </Link>
          </div>

          {!closed ? (
            <form
              action={resolveTicket}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <h2 className="mb-1 font-semibold">Decision</h2>
              <p className="mb-3 text-xs text-muted">
                Approve a claim or reject it. The customer is notified on their order page.
              </p>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="note"
                rows={2}
                maxLength={2000}
                placeholder="Optional note to the customer…"
                className="mb-3 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="space-y-2">
                {DECISIONS.map((d) => (
                  <button
                    key={d.value}
                    type="submit"
                    name="decision"
                    value={d.value}
                    className="flex w-full items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
                  >
                    <d.icon size={15} /> {d.label}
                  </button>
                ))}
                <button
                  type="submit"
                  name="decision"
                  value="Reject"
                  className="flex w-full items-center gap-2 rounded-lg border border-danger/40 px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 cursor-pointer"
                >
                  <XCircle size={15} /> Reject claim
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-5 text-sm">
              <h2 className="mb-2 font-semibold">Outcome</h2>
              {ticket.status === "Resolved" ? (
                <p className="flex items-center gap-2 font-medium text-success">
                  <BadgeCheck size={16} /> {ticket.resolution || "Resolved"}
                </p>
              ) : (
                <p className="flex items-center gap-2 font-medium text-danger">
                  <XCircle size={16} /> Rejected
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
