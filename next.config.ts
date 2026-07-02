import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy — a tightened STATIC policy that keeps `'unsafe-inline'`
 * for scripts/styles so every page stays statically renderable + CDN-cacheable
 * (a nonce CSP would force all-dynamic rendering — a deliberate tradeoff we did
 * NOT take). This is defense-in-depth: it does not block inline XSS, but it
 * locks default-src to self, constrains where the page may load scripts from
 * (self + GA/Meta only) and where it may connect/exfil to, and blocks plugins,
 * <base> hijacking and cross-origin form posts. `'unsafe-eval'` is added only in
 * development (React's HMR uses eval; production does not).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://connect.facebook.net https://www.facebook.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

// Sensible hardening headers applied to every response.
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
  { key: "Content-Security-Policy", value: csp },
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
