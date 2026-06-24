import { headers } from "next/headers";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limit backed by Upstash Redis (REST). Two deliberate
 * fallbacks: it is a no-op when Upstash isn't configured (dev/preview), and it
 * fails OPEN on a Redis error so a cache outage can never lock real users out.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
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
    if (!res.ok) return { allowed: true, remaining: limit, retryAfterSec: 0 };
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
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
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
): Promise<string | null> {
  const ip = await clientIp();
  const r = await rateLimit(`${bucket}:${ip}`, limit, windowSec);
  if (r.allowed) return null;
  return `Too many attempts. Please wait ${r.retryAfterSec}s and try again.`;
}
