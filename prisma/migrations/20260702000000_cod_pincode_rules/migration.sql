-- COD pincode rules (bonus; additive — new table only, empty by default).

-- CreateTable
CREATE TABLE "CodPincodeRule" (
    "id" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'STANDARD',
    "advanceOverride" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CodPincodeRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodPincodeRule_pincode_key" ON "CodPincodeRule"("pincode");
