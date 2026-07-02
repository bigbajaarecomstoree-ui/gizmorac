import { cookies } from "next/headers";
import {
  createToken,
  verifyToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

export { checkPassword, adminPasswordWeak } from "@/lib/session";

// Cookie-store helpers — server actions / server components only.

export async function setSessionCookie(): Promise<void> {
  const token = await createToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
