import { prisma } from "@/lib/prisma";
import { reconcilePhonePeOrder, releaseOrder } from "@/lib/data/payments";

export interface ReconcileSweep {
  scanned: number;
  paid: number; // late webhook → recovered as paid
  released: number; // abandoned/failed → stock + coupon restored
  stillPending: number; // genuinely in-flight, left for the next sweep
}

/**
 * Sweep stale Pending online orders. For each:
 *  - re-verify with PhonePe (a missed webhook may have actually paid → recover it),
 *  - if PhonePe says FAILED → release (handled inside reconcilePhonePeOrder),
 *  - if PhonePe still says PENDING past the hard cutoff → force-release so stock
 *    and the coupon are never held by an abandoned checkout.
 *
 * Idempotent + concurrency-safe (releaseOrder uses a compare-and-swap), so the
 * cron can overlap with the user's return-callback without double-restoring.
 */
export async function reconcileStalePendingOrders(opts?: {
  softMinutes?: number;
  hardMinutes?: number;
  limit?: number;
}): Promise<ReconcileSweep> {
  const soft = opts?.softMinutes ?? 15;
  const hard = opts?.hardMinutes ?? 60;
  const limit = opts?.limit ?? 200;
  const now = Date.now();
  const softCutoff = new Date(now - soft * 60_000);
  const hardCutoff = new Date(now - hard * 60_000);

  const stale = await prisma.order.findMany({
    where: {
      // Any order awaiting an online payment — full prepaid (PhonePe) OR the COD
      // booking advance — both sit at paymentStatus "Pending" until it clears.
      paymentStatus: "Pending",
      createdAt: { lt: softCutoff },
    },
    select: {
      id: true,
      orderNumber: true,
      items: true,
      couponCode: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let paid = 0;
  let released = 0;
  let stillPending = 0;

  for (const o of stale) {
    let r: "Paid" | "Failed" | "Pending" | "NotFound" = "Pending";
    try {
      r = await reconcilePhonePeOrder(o.orderNumber);
    } catch {
      // PhonePe unreachable — don't crash the sweep; fall through to the hard
      // cutoff so an abandoned order still can't hold stock forever.
      r = "Pending";
    }
    if (r === "Paid") {
      paid++;
    } else if (r === "Failed") {
      released++;
    } else if (o.createdAt < hardCutoff) {
      // PhonePe still says pending (or was unreachable) past the hard cutoff →
      // treat as abandoned and release.
      const ok = await releaseOrder(o, "Payment not completed within the time limit.");
      ok ? released++ : stillPending++;
    } else {
      stillPending++;
    }
  }

  return { scanned: stale.length, paid, released, stillPending };
}
