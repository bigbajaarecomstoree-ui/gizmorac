import { SignJWT, jwtVerify } from "jose";

// Pure JWT/session helpers with no `next/headers` dependency, so this module is
// safe to import from proxy.ts (and anywhere else).

// Resolve the signing key lazily so a missing/weak secret FAILS CLOSED at
// runtime in production (throws) instead of silently signing with a known
// default — which would make admin-token forgery trivial. Dev/test keep a
// default for DX. Lazy (not module-level) so it never crashes the build.
function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (raw && raw.length >= 16) return new TextEncoder().encode(raw);
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is missing or too short — refusing to sign/verify sessions in production.",
    );
  }
  return new TextEncoder().encode(raw ?? "insecure-dev-secret-change-me");
}

export const SESSION_COOKIE = "gz_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token?: string): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret(); // throws in prod if misconfigured — fail closed, fail loud
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/** Constant-time-ish comparison against the configured admin password. */
export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Heuristic weak-password check for the single shared admin credential — used
 * only to log a non-blocking advisory (never to reject the owner's login).
 * Deliberately generic: it must NOT reference the real password, which would
 * leak it into source. Flags anything short, low-variety, or containing an
 * obvious dictionary token.
 */
export function adminPasswordWeak(): boolean {
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (p.length < 12) return true;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(p),
  ).length;
  if (classes < 3) return true;
  const common = ["password", "admin", "welcome", "letmein", "changeme", "qwerty", "123456"];
  const low = p.toLowerCase();
  return common.some((c) => low.includes(c));
}
