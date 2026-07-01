import { isAuthenticated } from "@/lib/auth";
import { getLiveVisitorCount } from "@/lib/data/presence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only: the current live visitor count for the admin badge and card. */
export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const count = await getLiveVisitorCount();
  return Response.json({ count });
}
