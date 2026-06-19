import { isAuthenticated } from "@/lib/auth";
import { getAllProducts } from "@/lib/data/queries";
import {
  PRODUCT_CSV_HEADERS,
  productToCsvRow,
  buildCsv,
} from "@/lib/products-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const products = await getAllProducts();
  const body = buildCsv([
    [...PRODUCT_CSV_HEADERS],
    ...products.map(productToCsvRow),
  ]);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gizmorac-products-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
