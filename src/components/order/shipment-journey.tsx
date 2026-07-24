import { Truck, PackageX, Undo2 } from "lucide-react";
import type { TrackingResult } from "@/lib/shiprocket";
import { formatTrackingWhen } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";

/**
 * Customer-facing shipment journey: the courier's live status + scan-by-scan
 * activity feed (auto-synced from Shiprocket), with a plain-English banner
 * when a delivery attempt fails or the parcel starts returning (RTO).
 * Server-rendered; falls back to the stored fields when live data is down.
 */
export function ShipmentJourney({
  live,
  shipmentStatus,
  awb,
  courier,
  trackingUrl,
  rtoStatus,
}: {
  live: TrackingResult | null;
  shipmentStatus: string;
  awb: string;
  courier: string;
  trackingUrl: string;
  rtoStatus: string;
}) {
  const status = live?.status || shipmentStatus;
  const activities = live?.activities ?? [];
  const hasShipment = Boolean(awb || trackingUrl || status);
  const rtoActive = rtoStatus === "DELIVERY_FAILED" || rtoStatus === "RTO_INITIATED";
  if (!hasShipment && !rtoActive && activities.length === 0) return null;

  const shown = activities.slice(0, 8);

  return (
    <div className="mt-5 space-y-4">
      {/* delivery-problem banner — tells the customer what actually happened */}
      {rtoStatus === "DELIVERY_FAILED" ? (
        <div className="rounded-lg border border-highlight/50 bg-highlight/10 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <PackageX size={16} className="shrink-0" /> Delivery attempt unsuccessful
          </p>
          <p className="mt-1 pl-6 text-xs text-muted">
            The courier couldn&rsquo;t complete your delivery. They usually try again on the
            next working day — please keep your phone reachable and your address
            accessible.
          </p>
        </div>
      ) : rtoStatus === "RTO_INITIATED" ? (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <Undo2 size={16} className="shrink-0" /> Package returning to seller
          </p>
          <p className="mt-1 pl-6 text-xs text-muted">
            The courier couldn&rsquo;t deliver your package and it&rsquo;s now on its way back
            to us. If you&rsquo;d still like your order, please contact our support team and
            we&rsquo;ll help you sort it out.
          </p>
        </div>
      ) : null}

      {/* shipment summary */}
      {hasShipment ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
          <div className="text-sm">
            <p className="font-medium">
              {courier ? `Shipped via ${courier}` : "Shipment created"}
              {status ? <span className="text-muted"> · {status}</span> : null}
            </p>
            {awb ? (
              <p className="mt-0.5 text-xs text-muted">
                AWB: <span className="font-mono text-foreground">{awb}</span>
              </p>
            ) : null}
          </div>
          {trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Truck size={15} /> Track shipment
            </a>
          ) : null}
        </div>
      ) : null}

      {/* courier scan feed (newest first, straight from Shiprocket) */}
      {shown.length > 0 ? (
        <div className="rounded-lg border border-border bg-background px-4 py-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
            Delivery updates
          </h3>
          <ol className="mt-3">
            {shown.map((a, i) => (
              <li key={`${a.date}-${i}`} className="relative pb-3.5 pl-5 last:pb-0">
                <span
                  className={`absolute left-0 top-1 h-2 w-2 rounded-full ${
                    i === 0 ? "bg-accent ring-4 ring-accent/15" : "bg-border-bright"
                  }`}
                  aria-hidden
                />
                {i < shown.length - 1 ? (
                  <span
                    className="absolute bottom-0 left-[3.5px] top-4 w-px bg-border"
                    aria-hidden
                  />
                ) : null}
                <p
                  className={`text-xs ${
                    i === 0 ? "font-semibold text-foreground" : "font-medium text-muted"
                  }`}
                >
                  {a.activity}
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-faint">
                  {formatTrackingWhen(a.date)}
                  {a.location ? ` · ${a.location}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
