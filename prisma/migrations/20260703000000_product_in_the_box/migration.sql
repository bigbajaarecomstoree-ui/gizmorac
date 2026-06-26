-- Product "what's in the box" list (additive; JSON-encoded array, default empty).

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "inTheBox" TEXT NOT NULL DEFAULT '[]';
