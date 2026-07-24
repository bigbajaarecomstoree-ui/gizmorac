-- Additive: RTO return-leg freight (paise), default 0. Auto-booked equal to
-- the forward freight when an RTO starts; admin-editable in the order's
-- Shipping panel. No existing rows change behavior (0 = no RTO charge).
ALTER TABLE "Order" ADD COLUMN "rtoCostPaise" INTEGER NOT NULL DEFAULT 0;
