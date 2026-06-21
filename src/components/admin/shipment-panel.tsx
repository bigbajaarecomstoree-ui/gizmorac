"use client";

import * as React from "react";
import {
  Truck,
  Loader2,
  RefreshCw,
  ExternalLink,
  FileText,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { pushToShiprocket, syncShipment, shipNow } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

export function ShipmentPanel({
  orderId,
  connected,
  shiprocketOrderId,
  awb,
  courier,
  trackingUrl,
  labelUrl,
  shipmentStatus,
}: {
  orderId: string;
  connected: boolean;
  shiprocketOrderId: string;
  awb: string;
  courier: string;
  trackingUrl: string;
  labelUrl: string;
  shipmentStatus: string;
}) {
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const pushed = Boolean(shiprocketOrderId);
  const shipped = Boolean(awb);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 text-sm">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Truck size={18} className="text-accent" /> Shipping
      </h2>

      {!connected ? (
        <p className="text-muted">
          Connect Shiprocket in{" "}
          <a href="/admin/settings" className="text-accent-bright hover:text-accent">
            Settings
          </a>{" "}
          to ship this order.
        </p>
      ) : !shipped ? (
        <>
          <p className="text-muted">
            {pushed
              ? "Order is in Shiprocket — assign a courier to ship it."
              : "Not yet sent to Shiprocket."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="md" onClick={() => run(() => shipNow(orderId))} disabled={pending}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Ship now
            </Button>
            {!pushed ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => run(() => pushToShiprocket(orderId))}
                disabled={pending}
              >
                Just create order
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-faint">
            &ldquo;Ship now&rdquo; assigns the recommended courier, schedules pickup &amp;
            generates the label.
          </p>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted">Status</span>
            <span className="font-medium">{shipmentStatus || "Ready to ship"}</span>
          </div>
          {courier ? (
            <div className="flex justify-between">
              <span className="text-muted">Courier</span>
              <span className="font-medium">{courier}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted">AWB</span>
            <span className="font-mono">{awb}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {labelUrl ? (
              <a
                href={labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover"
              >
                <FileText size={14} /> Download label
              </a>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => run(() => syncShipment(orderId))}
              disabled={pending}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync tracking
            </Button>
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-accent-bright hover:text-accent"
              >
                Track <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-danger" role="alert">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}
    </div>
  );
}
