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
import { formatINR } from "@/lib/format";

export function ShipmentPanel({
  orderId,
  connected,
  shiprocketOrderId,
  awb,
  courier,
  trackingUrl,
  labelUrl,
  shipmentStatus,
  shipmentCostPaise,
  returnAwb,
  returnCourier,
  returnTrackingUrl,
  returnStatus,
  replacementAwb,
  replacementCourier,
  replacementTrackingUrl,
  replacementLabelUrl,
  replacementStatus,
}: {
  orderId: string;
  connected: boolean;
  shiprocketOrderId: string;
  awb: string;
  courier: string;
  trackingUrl: string;
  labelUrl: string;
  shipmentStatus: string;
  shipmentCostPaise: number;
  returnAwb: string;
  returnCourier: string;
  returnTrackingUrl: string;
  returnStatus: string;
  replacementAwb: string;
  replacementCourier: string;
  replacementTrackingUrl: string;
  replacementLabelUrl: string;
  replacementStatus: string;
}) {
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const pushed = Boolean(shiprocketOrderId);
  const shipped = Boolean(awb);
  const hasReplacement = Boolean(
    returnAwb || replacementAwb || returnStatus || replacementStatus,
  );

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
          <div className="flex justify-between">
            <span className="text-muted">Shipping cost</span>
            {shipmentCostPaise > 0 ? (
              <span className="font-semibold">{formatINR(shipmentCostPaise / 100)}</span>
            ) : (
              <span className="text-faint" title="Captured at dispatch — older shipments may not have it recorded">
                Not recorded
              </span>
            )}
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

      {hasReplacement ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-faint">
            <RefreshCw size={13} className="text-accent" /> Replacement
          </h3>

          {/* Reverse pickup: customer → warehouse */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">Return pickup · customer → warehouse</p>
            <div className="flex justify-between">
              <span className="text-muted">Status</span>
              <span className="font-medium">{returnStatus || "—"}</span>
            </div>
            {returnCourier ? (
              <div className="flex justify-between">
                <span className="text-muted">Courier</span>
                <span className="font-medium">{returnCourier}</span>
              </div>
            ) : null}
            {returnAwb ? (
              <div className="flex justify-between">
                <span className="text-muted">AWB</span>
                <span className="font-mono">{returnAwb}</span>
              </div>
            ) : null}
            {returnTrackingUrl ? (
              <a
                href={returnTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-bright hover:text-accent"
              >
                Track return <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          {/* Forward replacement: warehouse → customer */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">New shipment · warehouse → customer</p>
            <div className="flex justify-between">
              <span className="text-muted">Status</span>
              <span className="font-medium">{replacementStatus || "—"}</span>
            </div>
            {replacementCourier ? (
              <div className="flex justify-between">
                <span className="text-muted">Courier</span>
                <span className="font-medium">{replacementCourier}</span>
              </div>
            ) : null}
            {replacementAwb ? (
              <div className="flex justify-between">
                <span className="text-muted">AWB</span>
                <span className="font-mono">{replacementAwb}</span>
              </div>
            ) : null}
            {replacementLabelUrl || replacementTrackingUrl ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {replacementLabelUrl ? (
                  <a
                    href={replacementLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover"
                  >
                    <FileText size={14} /> Download label
                  </a>
                ) : null}
                {replacementTrackingUrl ? (
                  <a
                    href={replacementTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-bright hover:text-accent"
                  >
                    Track <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-danger" role="alert">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}
    </div>
  );
}
