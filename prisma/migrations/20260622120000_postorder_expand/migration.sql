-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_RETURNED', 'RETURNED', 'CANCELLED', 'RTO', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('ACTIVE', 'RETURN_REQUESTED', 'UNDER_INVESTIGATION', 'PICKUP_SCHEDULED', 'PICKED_UP', 'QC_PENDING', 'QC_PASSED', 'QC_PARTIAL', 'QC_FAILED', 'REFUND_APPROVED', 'REPLACEMENT_APPROVED', 'REFUNDED', 'REPLACED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'RAISED', 'UNDER_INVESTIGATION', 'ESCALATED', 'REJECTED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('CHANGE_OF_MIND', 'SIZE_ISSUE', 'DEFECTIVE_PRODUCT', 'DAMAGED_PRODUCT', 'WRONG_ITEM_RECEIVED', 'DELIVERY_DAMAGE', 'MISSING_ACCESSORIES', 'QUALITY_ISSUE');

-- CreateEnum
CREATE TYPE "QcResult" AS ENUM ('PENDING', 'PASSED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('SCHEDULED', 'PICKED_UP', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReplacementState" AS ENUM ('APPROVED', 'CREATED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL', 'MANUAL_UPI', 'MANUAL_NEFT', 'MANUAL_IMPS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationState" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('SALE', 'RESTOCK_QC_PASS', 'DAMAGE_QC_FAIL', 'REPLACEMENT_DISPATCH', 'RTO_RESTOCK', 'CANCEL_RESTOCK', 'MANUAL_ADJUST');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('NORMAL', 'ELEVATED', 'STRICT_REVIEW');

-- CreateEnum
CREATE TYPE "CreditNoteState" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('CUSTOMER', 'SUPPORT', 'OPERATIONS', 'QC', 'FINANCE', 'MANAGER', 'SYSTEM', 'ADMIN');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('ORDER', 'ORDER_ITEM', 'DISPUTE', 'REFUND', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'SUPPORT', 'OPERATIONS', 'QC', 'FINANCE', 'MANAGER');

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "maxDiscountPaise" INTEGER,
ADD COLUMN     "minOrderPaise" INTEGER,
ADD COLUMN     "valuePaise" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amountPaidPaise" INTEGER,
ADD COLUMN     "discountPaise" INTEGER,
ADD COLUMN     "instantDiscountPaise" INTEGER,
ADD COLUMN     "isReplacementOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentState" "PaymentStatus",
ADD COLUMN     "refundState" "RefundStatus",
ADD COLUMN     "refundedPaise" INTEGER DEFAULT 0,
ADD COLUMN     "replacesItemId" TEXT,
ADD COLUMN     "replacesOrderId" TEXT,
ADD COLUMN     "shippingPaise" INTEGER,
ADD COLUMN     "statusV2" "OrderStatus",
ADD COLUMN     "subtotalPaise" INTEGER,
ADD COLUMN     "totalPaise" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costPaise" INTEGER,
ADD COLUMN     "mrpPaise" INTEGER,
ADD COLUMN     "pricePaise" INTEGER;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "browseOfferAmountPaise" INTEGER,
ADD COLUMN     "cartOfferAmountPaise" INTEGER,
ADD COLUMN     "ffAutoQc" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ffFraudScoring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ffMakerChecker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ffNotifEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ffNotifPush" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ffNotifSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ffNotifWhatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ffPostOrderV2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ffRbac" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeShippingThresholdPaise" INTEGER,
ADD COLUMN     "highValueRefundPaise" INTEGER NOT NULL DEFAULT 500000,
ADD COLUMN     "investigationSlaHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "maxAppeals" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "restockingFeePercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "shippingFeePaise" INTEGER;

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productSlug" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "hsn" TEXT NOT NULL DEFAULT '',
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "qty" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "lineSubtotalPaise" INTEGER NOT NULL,
    "allocatedDiscountPaise" INTEGER NOT NULL DEFAULT 0,
    "allocatedShippingPaise" INTEGER NOT NULL DEFAULT 0,
    "netPaidPaise" INTEGER NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "returnReason" "ReturnReason",
    "version" INTEGER NOT NULL DEFAULT 0,
    "refundedPaise" INTEGER NOT NULL DEFAULT 0,
    "deductionPaise" INTEGER NOT NULL DEFAULT 0,
    "deductionReason" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "disputeNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'RAISED',
    "reason" "ReturnReason",
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "appealsUsed" INTEGER NOT NULL DEFAULT 0,
    "maxAppeals" INTEGER NOT NULL DEFAULT 1,
    "slaDueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "legacyTicketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeItem" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "outcome" "OrderItemStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "proofRequest" BOOLEAN NOT NULL DEFAULT false,
    "legacyMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "method" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL',
    "reason" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL,
    "refundReference" TEXT NOT NULL DEFAULT '',
    "gatewayReference" TEXT NOT NULL DEFAULT '',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT NOT NULL DEFAULT '',
    "creditNoteId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundTransaction" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "RefundStatus" NOT NULL,
    "gatewayReference" TEXT NOT NULL DEFAULT '',
    "requestPayload" TEXT NOT NULL DEFAULT '',
    "responsePayload" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementOrder" (
    "id" TEXT NOT NULL,
    "originalOrderId" TEXT NOT NULL,
    "originalItemId" TEXT NOT NULL,
    "replacementOrderId" TEXT,
    "state" "ReplacementState" NOT NULL DEFAULT 'APPROVED',
    "idempotencyKey" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReversePickup" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'shiprocket',
    "providerOrderId" TEXT NOT NULL DEFAULT '',
    "shipmentId" TEXT NOT NULL DEFAULT '',
    "awb" TEXT NOT NULL DEFAULT '',
    "courier" TEXT NOT NULL DEFAULT '',
    "trackingUrl" TEXT NOT NULL DEFAULT '',
    "status" "PickupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "idempotencyKey" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReversePickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcReport" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "result" "QcResult" NOT NULL DEFAULT 'PENDING',
    "conditionOk" BOOLEAN NOT NULL DEFAULT false,
    "serialOk" BOOLEAN NOT NULL DEFAULT false,
    "accessoriesOk" BOOLEAN NOT NULL DEFAULT false,
    "functionalOk" BOOLEAN NOT NULL DEFAULT false,
    "packagingOk" BOOLEAN NOT NULL DEFAULT false,
    "deductionPaise" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "photos" TEXT NOT NULL DEFAULT '[]',
    "inspectedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QcReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "refundId" TEXT,
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "amountPaise" INTEGER NOT NULL,
    "taxableValuePaise" INTEGER NOT NULL DEFAULT 0,
    "cgstPaise" INTEGER NOT NULL DEFAULT 0,
    "sgstPaise" INTEGER NOT NULL DEFAULT 0,
    "igstPaise" INTEGER NOT NULL DEFAULT 0,
    "state" "CreditNoteState" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "state" "NotificationState" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRiskProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "returnCount" INTEGER NOT NULL DEFAULT 0,
    "disputeCount" INTEGER NOT NULL DEFAULT 0,
    "returnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraudScore" INTEGER NOT NULL DEFAULT 0,
    "level" "RiskLevel" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "type" "InventoryTxnType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "orderId" TEXT,
    "previousState" TEXT NOT NULL DEFAULT '',
    "newState" TEXT NOT NULL,
    "actorRole" "ActorRole" NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorEmail" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "signature" TEXT NOT NULL DEFAULT '',
    "gatewayReference" TEXT NOT NULL DEFAULT '',
    "payload" TEXT NOT NULL DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "role" "AdminRole" NOT NULL DEFAULT 'OWNER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_disputeNumber_key" ON "Dispute"("disputeNumber");

-- CreateIndex
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_customerId_idx" ON "Dispute"("customerId");

-- CreateIndex
CREATE INDEX "DisputeItem_orderItemId_idx" ON "DisputeItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DisputeItem_disputeId_orderItemId_key" ON "DisputeItem"("disputeId", "orderItemId");

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_orderItemId_idx" ON "Refund"("orderItemId");

-- CreateIndex
CREATE INDEX "RefundTransaction_refundId_idx" ON "RefundTransaction"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplacementOrder_idempotencyKey_key" ON "ReplacementOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReplacementOrder_originalOrderId_idx" ON "ReplacementOrder"("originalOrderId");

-- CreateIndex
CREATE INDEX "ReplacementOrder_originalItemId_idx" ON "ReplacementOrder"("originalItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReversePickup_idempotencyKey_key" ON "ReversePickup"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReversePickup_orderId_idx" ON "ReversePickup"("orderId");

-- CreateIndex
CREATE INDEX "ReversePickup_orderItemId_idx" ON "ReversePickup"("orderItemId");

-- CreateIndex
CREATE INDEX "QcReport_orderItemId_idx" ON "QcReport"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "CreditNote_orderId_idx" ON "CreditNote"("orderId");

-- CreateIndex
CREATE INDEX "NotificationLog_orderId_idx" ON "NotificationLog"("orderId");

-- CreateIndex
CREATE INDEX "NotificationLog_state_idx" ON "NotificationLog"("state");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRiskProfile_customerId_key" ON "CustomerRiskProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_idempotencyKey_key" ON "InventoryTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orderId_idx" ON "InventoryTransaction"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_entityType_entityId_idx" ON "OrderStatusHistory"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_createdAt_idx" ON "OrderStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_gatewayReference_idx" ON "WebhookEvent"("gatewayReference");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Order_statusV2_idx" ON "Order"("statusV2");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeItem" ADD CONSTRAINT "DisputeItem_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeItem" ADD CONSTRAINT "DisputeItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementOrder" ADD CONSTRAINT "ReplacementOrder_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementOrder" ADD CONSTRAINT "ReplacementOrder_originalItemId_fkey" FOREIGN KEY ("originalItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReversePickup" ADD CONSTRAINT "ReversePickup_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReversePickup" ADD CONSTRAINT "ReversePickup_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcReport" ADD CONSTRAINT "QcReport_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRiskProfile" ADD CONSTRAINT "CustomerRiskProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

