import { isAuthenticated } from "@/lib/auth";
import {
  PRODUCT_CSV_HEADERS,
  PRODUCT_CSV_SAMPLE,
  buildCsv,
} from "@/lib/products-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = buildCsv([[...PRODUCT_CSV_HEADERS], ...PRODUCT_CSV_SAMPLE]);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-products-sample.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
