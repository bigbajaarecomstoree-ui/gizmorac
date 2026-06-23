-- Add per-product manufacturer warranty length (months; 0 = none).
ALTER TABLE "Product" ADD COLUMN "warrantyMonths" INTEGER NOT NULL DEFAULT 0;
