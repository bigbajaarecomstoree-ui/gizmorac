import { isAuthenticated } from "@/lib/auth";
import { getSubscribers } from "@/lib/data/subscribers";
import { getAudienceRows, type AudienceSegment } from "@/lib/data/audience";
import { buildCsv } from "@/lib/products-csv";

export const dynamic = "force-dynamic";

const SEGMENTS: AudienceSegment[] = [
  "subscribers",
  "customers",
  "repeat",
  "spent5000",
  "highvalue",
  "recent30",
];

const fmt = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const param = new URL(req.url).searchParams.get("segment") as AudienceSegment | null;
  const segment: AudienceSegment = param && SEGMENTS.includes(param) ? param : "subscribers";

  let header: string[];
  let rows: (string | number)[][];

  if (segment === "subscribers") {
    const subs = await getSubscribers();
    header = ["Serial Number", "Email", "Source", "Subscribed On"];
    rows = subs.map((s, i) => [i + 1, s.email, s.source, fmt(s.createdAt)]);
  } else {
    const data = await getAudienceRows(segment);
    header = ["Serial Number", "Email", "Name", "Orders", "Spent (INR)", "Last Order"];
    rows = data.map((r, i) => [i + 1, r.email, r.name, r.orders, r.spent, fmt(r.lastOrder)]);
  }

  const body = buildCsv([header, ...rows]);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-${segment}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
