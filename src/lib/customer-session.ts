import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Pure customer-session helpers: JWT signing/verification + password hashing.
// No `next/headers` import, so this is safe to use from any server context.
// (Do NOT import this from the edge proxy — node:crypto is Node-runtime only.)

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "insecure-dev-secret-change-me",
);

export const CUSTOMER_COOKIE = "gz_customer";
export const CUSTOMER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createCustomerToken(customerId: string): Promise<string> {
  return new SignJWT({ role: "customer" })
    .setSubject(customerId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

/** Returns the customer id if the token is a valid customer session, else null. */
export async function verifyCustomerToken(
  token?: string,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "customer" && typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

/** scrypt password hash, stored as `salt:hash` (both hex). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time verification against a `salt:hash` string. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
