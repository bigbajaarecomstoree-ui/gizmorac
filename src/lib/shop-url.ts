export type RawParams = Record<string, string | undefined>;

/**
 * Build a /shop URL by merging `patch` over the current params.
 * Pass a value of `undefined` (or "") in `patch` to remove that param —
 * handy for toggling a filter off or resetting pagination.
 */
export function buildShopUrl(current: RawParams, patch: RawParams): string {
  const merged: RawParams = { ...current, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/shop?${qs}` : "/shop";
}
