import { headers } from "next/headers";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Client IP from PLATFORM-trusted headers. The leftmost `x-forwarded-for`
 * entry is client-supplied (Vercel appends the real edge IP rather than
 * replacing it), so keying rate limits on it lets an attacker mint a fresh
 * counter per request by rotating the header. We prefer Vercel's own
 * `x-vercel-forwarded-for` / `x-real-ip` (set at the edge, not spoofable) and,
 * only as a last resort, the RIGHTMOST XFF hop (closest to our infra).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  const parts = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || "unknown";
}

/**
 * Fixed-window rate limit backed by Upstash Redis (REST). Two deliberate
 * fallbacks: it is a no-op when Upstash isn't configured (dev/preview), and it
 * fails OPEN on a Redis error so a cache outage can never lock real users out.
 */
export interface RateOpts {
  /**
   * Fail CLOSED (block) if the limiter is configured but the Redis call errors.
   * Use for auth/abuse buckets so a transient cache blip can't open the gate.
   * NOTE: when Redis isn't configured at all (dev/preview) we still allow, so
   * this never blocks local development.
   */
  failClosed?: boolean;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
  opts: RateOpts = {},
): Promise<RateResult> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
  const onError: RateResult = opts.failClosed
    ? { allowed: false, remaining: 0, retryAfterSec: Math.max(1, windowSec) }
    : { allowed: true, remaining: limit, retryAfterSec: 0 };
  const k = `rl:${key}`;
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      // INCR the counter, set the window TTL only on first hit (NX), read TTL.
      body: JSON.stringify([
        ["INCR", k],
        ["EXPIRE", k, String(windowSec), "NX"],
        ["TTL", k],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return onError;
    const data = (await res.json()) as { result: number }[];
    const count = Number(data?.[0]?.result ?? 0);
    const ttl = Number(data?.[2]?.result ?? windowSec);
    const allowed = count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - count),
      retryAfterSec: allowed ? 0 : Math.max(1, ttl),
    };
  } catch {
    return onError;
  }
}

/**
 * Rate-limit a named bucket by client IP. Returns a ready-to-show error string
 * when blocked, or null when allowed.
 */
export async function limitByIp(
  bucket: string,
  limit: number,
  windowSec: number,
  opts: RateOpts = {},
): Promise<string | null> {
  const ip = await clientIp();
  const r = await rateLimit(`${bucket}:${ip}`, limit, windowSec, opts);
  if (r.allowed) return null;
  return `Too many attempts. Please wait ${r.retryAfterSec}s and try again.`;
}
