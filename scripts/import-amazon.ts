// One-off loader: import an Amazon Seller Central listings report into the DB.
// Usage: npx tsx scripts/import-amazon.ts "/path/to/All+Listings+Report.txt"
// Uses the same mapper as the in-admin "Import from Amazon" button.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { mapAmazonReportToProducts } from "../src/lib/amazon-import";

const prisma = new PrismaClient();

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Pass the report file path as the first argument.");

  const text = readFileSync(path, "utf8");
  const { records, skipped, total } = mapAmazonReportToProducts(text);
  console.log(`Parsed ${total} rows → ${records.length} products (${skipped} skipped).`);

  let created = 0;
  let updated = 0;
  for (const rec of records) {
    const data = {
      name: rec.name,
      brand: "GIZMORAC",
      sku: rec.sku,
      asin: rec.asin,
      category: rec.category,
      art: rec.art,
      price: rec.price,
      mrp: rec.mrp,
      stock: rec.stock,
      lowStockThreshold: 10,
      shortDescription: rec.shortDescription,
      description: rec.description,
      isBestSeller: rec.isBestSeller,
      isFeatured: rec.isFeatured,
      isDeal: rec.isDeal,
      active: rec.active,
    };
    const existing = rec.asin
      ? await prisma.product.findFirst({ where: { asin: rec.asin } })
      : await prisma.product.findUnique({ where: { slug: rec.slug } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.product.create({
        data: {
          id: `p-${rec.slug}-${Math.random().toString(36).slice(2, 6)}`,
          slug: rec.slug,
          images: "[]",
          ...data,
        },
      });
      created += 1;
    }
  }
  console.log(`Done. Created ${created}, updated ${updated}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
