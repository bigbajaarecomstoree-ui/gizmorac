import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string equality for secrets (webhook tokens, etc.). A plain
 * `!==` short-circuits on the first differing byte, leaking the secret's length
 * of a correct prefix via response timing. Length is compared first (an equal-
 * length requirement of timingSafeEqual; the length itself isn't sensitive
 * here), then the bytes are compared in constant time. Node-runtime only.
 */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
