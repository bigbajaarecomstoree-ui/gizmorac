import { isAuthenticated } from "@/lib/auth";
import { getSubscribers } from "@/lib/data/subscribers";

export const dynamic = "force-dynamic";

/** Escape a value for CSV (wrap in quotes, double embedded quotes). */
function csv(value: string | number): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscribers = await getSubscribers();

  const header = ["Serial Number", "Email", "Subscribed On"];
  const rows = subscribers.map((s, i) =>
    [i + 1, s.email, new Date(s.createdAt).toLocaleString("en-IN")]
      .map(csv)
      .join(","),
  );

  // UTF-8 BOM so Excel opens it cleanly.
  const body = "﻿" + [header.map(csv).join(","), ...rows].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-subscribers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
