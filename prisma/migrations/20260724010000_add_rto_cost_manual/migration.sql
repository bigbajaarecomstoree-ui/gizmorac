-- Additive: marks an admin pencil-edit of the RTO return cost as a deliberate
-- override so the Shiprocket auto-reconcile never fights it. Default false.
ALTER TABLE "Order" ADD COLUMN "rtoCostManual" BOOLEAN NOT NULL DEFAULT false;
