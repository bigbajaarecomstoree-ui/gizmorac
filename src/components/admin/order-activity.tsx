import {
  Package,
  IndianRupee,
  XCircle,
  Truck,
  RefreshCw,
  Undo2,
  ArrowRight,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { OrderEvent } from "@/lib/data/logs";

type Tone = "default" | "success" | "danger" | "accent";

const META: Record<string, { label: string; Icon: LucideIcon; tone: Tone }> = {
  "order.placed": { label: "Order placed", Icon: Package, tone: "default" },
  "payment.paid": { label: "Payment received", Icon: IndianRupee, tone: "success" },
  "payment.failed": { label: "Payment failed", Icon: XCircle, tone: "danger" },
  "admin.order.status": { label: "Status updated", Icon: ArrowRight, tone: "default" },
  "admin.order.refund": { label: "Refund", Icon: Undo2, tone: "accent" },
  "admin.order.replacement": { label: "Replacement", Icon: RefreshCw, tone: "accent" },
  "admin.shipping.push": { label: "Sent to Shiprocket", Icon: Truck, tone: "default" },
  "admin.shipping.shipped": { label: "Shipped", Icon: Truck, tone: "success" },
  "admin.shipping.cancel": { label: "Shipment cancelled", Icon: XCircle, tone: "danger" },
};

const DOT: Record<Tone, string> = {
  default: "border-border bg-surface text-muted",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
  accent: "border-accent/30 bg-accent/10 text-accent",
};

function actorName(actor: string, email: string): string {
  const who = actor === "admin" ? "Admin" : actor === "customer" ? "Customer" : "System";
  return email ? `${who} · ${email}` : who;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relative(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return when(iso);
}

export function OrderActivity({ events }: { events: OrderEvent[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <h2 className="flex items-center gap-2 border-b border-border px-5 py-3.5 font-semibold">
        <Activity size={18} className="text-accent" /> Activity
        <span className="text-sm font-normal text-muted">({events.length})</span>
      </h2>

      {events.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No activity recorded yet.</p>
      ) : (
        <ol className="px-5 py-4">
          {events
            .slice()
            .reverse()
            .map((e, i, arr) => {
              const m = META[e.action] ?? {
                label: e.action,
                Icon: Activity,
                tone: "default" as Tone,
              };
              const last = i === arr.length - 1;
              return (
                <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* rail */}
                  {!last ? (
                    <span
                      className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${DOT[m.tone]}`}
                  >
                    <m.Icon size={15} />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-medium">{m.label}</p>
                    {e.message ? (
                      <p className="mt-0.5 text-sm text-muted break-words">{e.message}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-faint" title={when(e.createdAt)}>
                      {actorName(e.actor, e.actorEmail)} · {relative(e.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
