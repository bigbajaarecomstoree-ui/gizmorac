-- COD Advance Payment + RTO Management (additive only; dark until codAdvanceEnabled).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "codAdvancePaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codRemainingPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryCollectedPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryPaymentStatus" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rtoStatus" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "codAdvanceAmount" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "codAdvanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "codAdvanceMax" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "codAdvanceMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codAdvancePercent" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "codAdvanceType" TEXT NOT NULL DEFAULT 'FIXED';

-- CreateIndex
CREATE INDEX "Order_paymentMethod_idx" ON "Order"("paymentMethod");

-- CreateIndex
CREATE INDEX "Order_rtoStatus_idx" ON "Order"("rtoStatus");
