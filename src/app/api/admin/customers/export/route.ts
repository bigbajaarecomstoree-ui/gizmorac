import { isAuthenticated } from "@/lib/auth";
import { getCustomersWithStats } from "@/lib/data/customers";
import { buildCsv } from "@/lib/products-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const customers = await getCustomersWithStats();

  const header = [
    "Serial Number",
    "Full Name",
    "Number",
    "Address",
    "Number of orders",
  ];

  const rows = customers.map((c, i) => {
    const address = [c.address, c.city, c.state, c.pincode]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");
    return [i + 1, c.fullName, c.phone, address, c.orderCount];
  });

  const body = buildCsv([header, ...rows]);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-customers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
