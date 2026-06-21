"use client";

import * as React from "react";
import { Truck, Loader2, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { pushToShiprocket, syncShipment } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

export function ShipmentPanel({
  orderId,
  connected,
  shiprocketOrderId,
  awb,
  courier,
  trackingUrl,
  shipmentStatus,
}: {
  orderId: string;
  connected: boolean;
  shiprocketOrderId: string;
  awb: string;
  courier: string;
  trackingUrl: string;
  shipmentStatus: string;
}) {
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const pushed = Boolean(shiprocketOrderId);

  function push() {
    setError(null);
    start(async () => {
      const res = await pushToShiprocket(orderId);
      if (!res.ok) setError(res.error ?? "Could not push to Shiprocket.");
    });
  }
  function sync() {
    setError(null);
    start(async () => {
      const res = await syncShipment(orderId);
      if (!res.ok) setError(res.error ?? "Could not refresh tracking.");
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
      ) : !pushed ? (
        <>
          <p className="text-muted">Not yet sent to Shiprocket.</p>
          <Button type="button" size="md" onClick={push} disabled={pending} className="mt-3">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
            Ship with Shiprocket
          </Button>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted">Status</span>
            <span className="font-medium">{shipmentStatus || "Created"}</span>
          </div>
          {courier ? (
            <div className="flex justify-between">
              <span className="text-muted">Courier</span>
              <span className="font-medium">{courier}</span>
            </div>
          ) : null}
          {awb ? (
            <div className="flex justify-between">
              <span className="text-muted">AWB</span>
              <span className="font-mono">{awb}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button type="button" size="sm" variant="outline" onClick={sync} disabled={pending}>
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
        <p className="mt-3 flex items-center gap-1.5 text-sm text-danger" role="alert">
          <AlertTriangle size={14} /> {error}
        </p>
      ) : null}
    </div>
  );
}
