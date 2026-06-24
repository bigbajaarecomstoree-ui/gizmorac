"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

/** Fires a single analytics event once when mounted (e.g. view_item, begin_checkout). */
export function TrackEvent({
  name,
  params,
}: {
  name: string;
  params?: Record<string, unknown>;
}) {
  React.useEffect(() => {
    track(name, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export interface PurchaseItem {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
}

/** Fires `purchase` exactly once per order (deduped via localStorage on refresh). */
export function TrackPurchase({
  orderNumber,
  value,
  currency = "INR",
  items,
}: {
  orderNumber: string;
  value: number;
  currency?: string;
  items: PurchaseItem[];
}) {
  React.useEffect(() => {
    const key = `gz_purchase_${orderNumber}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track("purchase", { transaction_id: orderNumber, value, currency, items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);
  return null;
}
