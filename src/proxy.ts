import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";

// Storefront kill switch. When true, every storefront page answers with a bare
// server error. /admin, /api (payment webhooks, PhonePe callback, cron) and
// static assets keep working so in-flight orders can still be managed.
// 503 + Retry-After tells search engines the outage is temporary.
const STOREFRONT_DOWN = true;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guards the /admin area. The login page is always reachable; every other
  // /admin route requires a valid session cookie.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (await verifyToken(token)) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (STOREFRONT_DOWN) {
    return new NextResponse("Internal Server Error", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "3600",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Every page route; skips API routes, Next's static/image pipeline, and
  // public files (anything with a file extension).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
