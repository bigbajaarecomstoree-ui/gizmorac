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
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  pushToShiprocket,
  syncShipment,
  shipNow,
  setShipmentCost,
  setRtoCost,
  autoEstimateDeliveryCost,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

/**
 * Delivery cost row. Auto-detects the freight from Shiprocket for the order's
 * destination pincode (no manual entry) and stores it; once the order ships,
 * shipmentCostPaise already holds the real charge, so we just display it. A
 * refresh re-quotes the rate; the pencil is a manual override for edge cases.
 */
function DeliveryCost({
  orderId,
  costPaise,
  connected,
  shipped,
}: {
  orderId: string;
  costPaise: number;
  connected: boolean;
  shipped: boolean;
}) {
  const [current, setCurrent] = React.useState(costPaise);
  const [courier, setCourier] = React.useState("");
  // A figure on an un-shipped order is a Shiprocket estimate; once shipped it's actual.
  const [estimated, setEstimated] = React.useState(!shipped && costPaise > 0);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(costPaise > 0 ? String(costPaise / 100) : "");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const autoTried = React.useRef(false);

  React.useEffect(() => {
    setCurrent(costPaise);
    setValue(costPaise > 0 ? String(costPaise / 100) : "");
  }, [costPaise]);

  const estimate = React.useCallback(() => {
    setErr(null);
    setLoading(true);
    start(async () => {
      const res = await autoEstimateDeliveryCost(orderId);
      setLoading(false);
      if (!res.ok) {
        setErr(res.error ?? "Couldn't fetch the rate.");
        return;
      }
      if (typeof res.ratePaise === "number") setCurrent(res.ratePaise);
      setCourier(res.courier ?? "");
      setEstimated(Boolean(res.estimated));
    });
  }, [orderId]);

  // Auto-detect once, on first view of a connected, not-yet-shipped order with
  // no figure recorded yet. Stored after, so later views don't re-hit the API.
  React.useEffect(() => {
    if (autoTried.current) return;
    if (connected && !shipped && current === 0) {
      autoTried.current = true;
      estimate();
    }
  }, [connected, shipped, current, estimate]);

  function open() {
    setErr(null);
    setValue(current > 0 ? String(current / 100) : "");
    setEditing(true);
  }

  function save() {
    const rupees = Number(value.trim() === "" ? "0" : value);
    if (!Number.isFinite(rupees) || rupees < 0) {
      setErr("Enter a valid amount.");
      return;
    }
    setErr(null);
    start(async () => {
      const res = await setShipmentCost(orderId, rupees);
      if (!res.ok) {
        setErr(res.error ?? "Could not save.");
        return;
      }
      setCurrent(Math.round(rupees * 100));
      setEstimated(false); // a hand-entered figure is treated as confirmed
      setEditing(false);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted">Delivery cost</span>
        {editing ? (
          <span className="flex items-center gap-1">
            <span className="text-muted">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="0"
              aria-label="Delivery cost in rupees"
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending}
              aria-label="Save delivery cost"
              className="grid h-7 w-7 place-items-center rounded-md bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErr(null);
              }}
              aria-label="Cancel"
              className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition-colors hover:text-foreground"
            >
              <X size={14} />
            </button>
          </span>
        ) : loading ? (
          <span className="flex items-center gap-1.5 text-muted">
            <Loader2 size={13} className="animate-spin" /> Estimating…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {current > 0 ? (
              <span className="font-semibold">{formatINR(current / 100)}</span>
            ) : (
              <span className="text-faint">—</span>
            )}
            {connected && !shipped ? (
              <button
                type="button"
                onClick={estimate}
                aria-label="Re-estimate from Shiprocket"
                title="Re-estimate from Shiprocket"
                className="text-faint transition-colors hover:text-accent"
              >
                <RefreshCw size={12} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={open}
              aria-label="Edit delivery cost manually"
              title="Edit manually"
              className="text-faint transition-colors hover:text-accent"
            >
              <Pencil size={12} />
            </button>
          </span>
        )}
      </div>
      {!editing && !loading && current > 0 ? (
        <p className="text-right text-xs text-faint">
          {shipped
            ? "Actual · Shiprocket"
            : `Estimated${courier ? ` · ${courier}` : " · Shiprocket"}`}
        </p>
      ) : null}
      {err ? (
        <p className="text-right text-xs text-danger" role="alert">
          {err}
        </p>
      ) : null}
    </>
  );
}

/**
 * RTO return-leg freight row + two-way total. Auto-booked equal to the
 * forward freight when an RTO starts (that's how couriers bill the return);
 * the pencil corrects it once Shiprocket's actual charge is known.
 */
function RtoCost({
  orderId,
  costPaise,
  forwardPaise,
}: {
  orderId: string;
  costPaise: number;
  forwardPaise: number;
}) {
  const [current, setCurrent] = React.useState(costPaise);
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(costPaise > 0 ? String(costPaise / 100) : "");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCurrent(costPaise);
    setValue(costPaise > 0 ? String(costPaise / 100) : "");
  }, [costPaise]);

  function save() {
    const rupees = Number(value.trim() === "" ? "0" : value);
    if (!Number.isFinite(rupees) || rupees < 0) {
      setErr("Enter a valid amount.");
      return;
    }
    setErr(null);
    start(async () => {
      const res = await setRtoCost(orderId, rupees);
      if (!res.ok) {
        setErr(res.error ?? "Could not save.");
        return;
      }
      setCurrent(Math.round(rupees * 100));
      setEditing(false);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted">RTO return cost</span>
        {editing ? (
          <span className="flex items-center gap-1">
            <span className="text-muted">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="0"
              aria-label="RTO return cost in rupees"
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending}
              aria-label="Save RTO return cost"
              className="grid h-7 w-7 place-items-center rounded-md bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErr(null);
              }}
              aria-label="Cancel"
              className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted transition-colors hover:text-foreground"
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {current > 0 ? (
              <span className="font-semibold text-danger">{formatINR(current / 100)}</span>
            ) : (
              <span className="text-faint">—</span>
            )}
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setValue(current > 0 ? String(current / 100) : "");
                setEditing(true);
              }}
              aria-label="Edit RTO return cost"
              title="Edit manually"
              className="text-faint transition-colors hover:text-accent"
            >
              <Pencil size={12} />
            </button>
          </span>
        )}
      </div>
      {!editing && current > 0 && current === forwardPaise ? (
        <p className="text-right text-xs text-faint">Estimated · equal to forward freight</p>
      ) : null}
      {err ? (
        <p className="text-right text-xs text-danger" role="alert">
          {err}
        </p>
      ) : null}
      {!editing && current > 0 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5">
          <span className="text-muted">Total shipping</span>
          <span className="font-semibold">
            {formatINR((forwardPaise + current) / 100)}
            <span className="ml-1 text-xs font-normal text-faint">
              ({formatINR(forwardPaise / 100)} send + {formatINR(current / 100)} return)
            </span>
          </span>
        </div>
      ) : null}
    </>
  );
}

const RTO_LABELS: Record<string, string> = {
  DELIVERY_FAILED: "Delivery failed",
  RTO_INITIATED: "RTO in progress",
  RTO_RECEIVED: "RTO received",
};

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
  rtoStatus = "NONE",
  rtoCostPaise = 0,
  activities = [],
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
  rtoStatus?: string;
  rtoCostPaise?: number;
  activities?: { when: string; activity: string; location: string }[];
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
          {rtoStatus !== "NONE" ? (
            <div className="flex justify-between">
              <span className="text-muted">RTO</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                <AlertTriangle size={11} /> {RTO_LABELS[rtoStatus] ?? rtoStatus}
              </span>
            </div>
          ) : null}
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
          <DeliveryCost
            orderId={orderId}
            costPaise={shipmentCostPaise}
            connected={connected}
            shipped={shipped}
          />
          {rtoStatus !== "NONE" || rtoCostPaise > 0 ? (
            <RtoCost
              orderId={orderId}
              costPaise={rtoCostPaise}
              forwardPaise={shipmentCostPaise}
            />
          ) : null}
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

          {activities.length > 0 ? (
            <div className="mt-3 border-t border-border pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
                Courier updates
              </h3>
              <ol className="mt-2.5">
                {activities.map((a, i) => (
                  <li key={`${a.when}-${i}`} className="relative pb-3 pl-4 last:pb-0">
                    <span
                      className={`absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full ${
                        i === 0 ? "bg-accent" : "bg-border-bright"
                      }`}
                      aria-hidden
                    />
                    {i < activities.length - 1 ? (
                      <span
                        className="absolute bottom-0 left-[2.5px] top-3.5 w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    <p className={`text-xs ${i === 0 ? "font-semibold" : "text-muted"}`}>
                      {a.activity}
                    </p>
                    <p className="text-[0.6875rem] text-faint">
                      {a.when}
                      {a.location ? ` · ${a.location}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[0.6875rem] text-faint">
                Auto-synced from Shiprocket — on page view, via webhook, and by the daily
                sweep.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Orders fulfilled outside the Shiprocket auto-flow (no AWB) can still
          record what was paid for delivery. */}
      {!shipped ? (
        <div className="mt-3 border-t border-border pt-3">
          <DeliveryCost
            orderId={orderId}
            costPaise={shipmentCostPaise}
            connected={connected}
            shipped={shipped}
          />
        </div>
      ) : null}

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
