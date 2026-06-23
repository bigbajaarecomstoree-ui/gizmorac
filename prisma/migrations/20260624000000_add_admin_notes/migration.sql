-- Internal admin-only notes per order.
ALTER TABLE "Order" ADD COLUMN "adminNotes" TEXT NOT NULL DEFAULT '';
