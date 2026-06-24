// Client-side analytics dispatch. No-ops safely when GA4 / Meta Pixel aren't
// loaded (env unset), so call sites never need to guard.

type Params = Record<string, unknown>;

interface AnalyticsItem {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// GA4 event name → Meta Pixel standard event.
const PIXEL_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
};

function pixelPayload(params: Params) {
  const items = (params.items as AnalyticsItem[] | undefined) ?? [];
  return {
    value: params.value,
    currency: params.currency ?? "INR",
    content_type: "product",
    content_ids: items.map((i) => i.item_id),
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1 })),
  };
}

/** Fire a GA4 event (+ the mapped Meta Pixel event when applicable). Pushes
 *  straight to dataLayer so events queued before gtag.js loads aren't lost. */
export function track(name: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  (window.dataLayer = window.dataLayer || []).push(["event", name, params]);
  const pixelEvent = PIXEL_MAP[name];
  if (pixelEvent && typeof window.fbq === "function") {
    window.fbq("track", pixelEvent, pixelPayload(params));
  }
}

/** SPA page view (route change) for GA4 + Pixel. */
export function pageview(url: string) {
  if (typeof window === "undefined") return;
  (window.dataLayer = window.dataLayer || []).push(["event", "page_view", { page_path: url }]);
  if (typeof window.fbq === "function") window.fbq("track", "PageView");
}
