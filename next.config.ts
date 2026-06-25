import type { NextConfig } from "next";
import path from "node:path";

// Sensible hardening headers applied to every response. (No strict CSP, which
// would require per-request nonces for Next's inline runtime + JSON-LD.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Partial CSP: only directives that can't break Next's inline runtime, the
  // JSON-LD, or GA/Pixel (no default-src/script-src, so scripts + connections
  // stay unrestricted). Covers clickjacking, <base> injection, plugin embeds,
  // and cross-origin form posts. A nonce-based script-src is a future follow-up.
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  // Pin the Turbopack root to this app (a stray lockfile sits one level up).
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Product/category images uploaded to Vercel Blob in production.
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
