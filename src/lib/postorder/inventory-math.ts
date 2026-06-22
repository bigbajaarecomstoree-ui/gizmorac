// Inventory is authoritative (spec §12). Pure guard — no negative stock, no
// oversell. The DB layer applies this inside a transaction.

export interface ApplyDeltaResult {
  ok: boolean;
  stock: number;
  error?: string;
}

/** Apply a stock delta, refusing any move that would go negative. */
export function applyDelta(current: number, delta: number): ApplyDeltaResult {
  const next = current + delta;
  if (next < 0) {
    return { ok: false, stock: current, error: "Insufficient stock (would go negative)." };
  }
  return { ok: true, stock: next };
}
