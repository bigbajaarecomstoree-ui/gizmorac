"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  RotateCcw,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Check,
} from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { cancelMyOrder } from "@/lib/storefront/actions";

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed";
const OUTLINE = "border border-border text-muted hover:border-accent hover:text-accent";
const DISABLED = "border border-border text-faint opacity-60";

/**
 * Customer order actions, shared by the account cards and the order page:
 * Track · Buy again · Cancel · Dispute. Cancel/Dispute availability is decided
 * on the server (status + 48h window) and passed in as booleans.
 */
export function OrderActions({
  orderNumber,
  items,
  canCancel,
  cancelDeadlineLabel,
  canDispute,
  canWarranty = false,
  hasOpenTicket = false,
  showTrack = true,
  trackLabel = "Track order",
}: {
  orderNumber: string;
  items: { id: string; qty: number }[];
  canCancel: boolean;
  cancelDeadlineLabel?: string;
  canDispute: boolean;
  canWarranty?: boolean;
  hasOpenTicket?: boolean;
  showTrack?: boolean;
  trackLabel?: string;
}) {
  const { addToCart } = useStore();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  function buyAgain() {
    if (items.length === 0) return;
    for (const it of items) addToCart(it.id, it.qty);
    router.push("/cart");
  }

  function cancel() {
    setError(null);
    start(async () => {
      const res = await cancelMyOrder(orderNumber);
      setConfirming(false);
      if (!res.ok) {
        setError(res.error ?? "Couldn't cancel the order.");
        return;
      }
      setDone(res.message ?? "Order cancelled.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {showTrack ? (
          <Link
            href={`/order/${orderNumber}`}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            {trackLabel}
            <ChevronRight size={14} />
          </Link>
        ) : null}

        <button type="button" onClick={buyAgain} className={`${BTN} ${OUTLINE}`}>
          <RotateCcw size={14} /> Buy again
        </button>

        {/* Cancel — only before the courier picks it up */}
        {canCancel ? (
          confirming ? (
            <span className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className={`${BTN} border border-danger bg-danger/10 text-danger hover:bg-danger/15`}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className={`${BTN} ${OUTLINE}`}
              >
                Keep order
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              className={`${BTN} border border-border text-danger hover:border-danger hover:bg-danger/5`}
            >
              <XCircle size={14} /> Cancel order
            </button>
          )
        ) : null}

        {/* Dispute — only while delivered and inside the 48h window */}
        {hasOpenTicket ? (
          <Link href={`/order/${orderNumber}#raise-dispute`} className={`${BTN} ${OUTLINE}`}>
            <ShieldAlert size={14} /> View dispute
          </Link>
        ) : canDispute ? (
          <Link href={`/order/${orderNumber}#raise-dispute`} className={`${BTN} ${OUTLINE}`}>
            <ShieldAlert size={14} /> Raise dispute
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Disputes can be raised within 48 hours of delivery."
            className={`${BTN} ${DISABLED}`}
          >
            <ShieldAlert size={14} /> Dispute
          </button>
        )}

        {/* Warranty claim — only shown when an item is under manufacturer warranty */}
        {canWarranty ? (
          <Link href={`/order/${orderNumber}#warranty-claim`} className={`${BTN} ${OUTLINE}`}>
            <ShieldCheck size={14} /> Warranty claim
          </Link>
        ) : null}
      </div>

      {canCancel && cancelDeadlineLabel && !confirming && !done ? (
        <p className="mt-2 text-xs text-faint">
          Free cancellation until {cancelDeadlineLabel}. After that, any product
          issue can be raised as a dispute once delivered.
        </p>
      ) : null}

      {done ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
          <Check size={14} /> {done}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
