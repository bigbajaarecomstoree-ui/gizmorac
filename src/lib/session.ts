import { SignJWT, jwtVerify } from "jose";

// Pure JWT/session helpers with no `next/headers` dependency, so this module is
// safe to import from proxy.ts (and anywhere else).

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "insecure-dev-secret-change-me",
);

export const SESSION_COOKIE = "gz_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token?: string): Promise<boolean> {
  if (!token) return false;
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
