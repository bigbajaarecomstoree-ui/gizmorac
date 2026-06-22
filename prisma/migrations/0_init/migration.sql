-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "art" TEXT NOT NULL DEFAULT 'printer',
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percent',
    "value" INTEGER NOT NULL DEFAULT 0,
    "minOrder" INTEGER NOT NULL DEFAULT 0,
    "maxDiscount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "orderId" TEXT,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'info',
    "actor" TEXT NOT NULL DEFAULT 'system',
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorEmail" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "items" TEXT NOT NULL DEFAULT '[]',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "shipping" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
    "couponCode" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "instantDiscount" INTEGER NOT NULL DEFAULT 0,
    "instantOffer" TEXT NOT NULL DEFAULT '',
    "gstin" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT NOT NULL DEFAULT '',
    "paymentRef" TEXT NOT NULL DEFAULT '',
    "paymentStatus" TEXT NOT NULL DEFAULT '',
    "paymentError" TEXT NOT NULL DEFAULT '',
    "paymentInstrument" TEXT NOT NULL DEFAULT '',
    "refundAmount" INTEGER NOT NULL DEFAULT 0,
    "refundRef" TEXT NOT NULL DEFAULT '',
    "refundStatus" TEXT NOT NULL DEFAULT '',
    "awb" TEXT NOT NULL DEFAULT '',
    "courier" TEXT NOT NULL DEFAULT '',
    "shipmentId" TEXT NOT NULL DEFAULT '',
    "shipmentStatus" TEXT NOT NULL DEFAULT '',
    "shiprocketOrderId" TEXT NOT NULL DEFAULT '',
    "trackingUrl" TEXT NOT NULL DEFAULT '',
    "labelUrl" TEXT NOT NULL DEFAULT '',
    "replacementAwb" TEXT NOT NULL DEFAULT '',
    "replacementCourier" TEXT NOT NULL DEFAULT '',
    "replacementLabelUrl" TEXT NOT NULL DEFAULT '',
    "replacementOrderId" TEXT NOT NULL DEFAULT '',
    "replacementShipmentId" TEXT NOT NULL DEFAULT '',
    "replacementStatus" TEXT NOT NULL DEFAULT '',
    "replacementTrackingUrl" TEXT NOT NULL DEFAULT '',
    "returnAwb" TEXT NOT NULL DEFAULT '',
    "returnCourier" TEXT NOT NULL DEFAULT '',
    "returnOrderId" TEXT NOT NULL DEFAULT '',
    "returnShipmentId" TEXT NOT NULL DEFAULT '',
    "returnStatus" TEXT NOT NULL DEFAULT '',
    "returnTrackingUrl" TEXT NOT NULL DEFAULT '',
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'GIZMORAC',
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "image" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "video" TEXT,
    "price" INTEGER NOT NULL,
    "mrp" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "badges" TEXT NOT NULL DEFAULT '[]',
    "highlights" TEXT NOT NULL DEFAULT '[]',
    "features" TEXT NOT NULL DEFAULT '[]',
    "specs" TEXT NOT NULL DEFAULT '[]',
    "faqs" TEXT NOT NULL DEFAULT '[]',
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDeal" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asin" TEXT,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "hsn" TEXT NOT NULL DEFAULT '',
    "breadthCm" INTEGER NOT NULL DEFAULT 12,
    "heightCm" INTEGER NOT NULL DEFAULT 5,
    "lengthCm" INTEGER NOT NULL DEFAULT 15,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "author" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'store',
    "storeName" TEXT NOT NULL DEFAULT 'GIZMORAC',
    "supportEmail" TEXT NOT NULL DEFAULT '',
    "supportPhone" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT NOT NULL DEFAULT '919999999999',
    "announcementText" TEXT NOT NULL DEFAULT 'Free shipping over ₹999 · PAN India delivery · COD available',
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT true,
    "announcementScroll" BOOLEAN NOT NULL DEFAULT false,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 999,
    "shippingFee" INTEGER NOT NULL DEFAULT 79,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "browseOfferAmount" INTEGER NOT NULL DEFAULT 100,
    "browseOfferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cartOfferAmount" INTEGER NOT NULL DEFAULT 100,
    "cartOfferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "landingPopupCode" TEXT NOT NULL DEFAULT '',
    "landingPopupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "landingPopupMessage" TEXT NOT NULL DEFAULT '',
    "landingPopupTitle" TEXT NOT NULL DEFAULT '',
    "phonepeClientId" TEXT NOT NULL DEFAULT '',
    "phonepeClientSecret" TEXT NOT NULL DEFAULT '',
    "phonepeClientVersion" TEXT NOT NULL DEFAULT '1',
    "phonepeConnected" BOOLEAN NOT NULL DEFAULT false,
    "phonepeEnv" TEXT NOT NULL DEFAULT 'sandbox',
    "browseOfferDelay" INTEGER NOT NULL DEFAULT 25,
    "cartOfferDelay" INTEGER NOT NULL DEFAULT 60,
    "companyAddress" TEXT NOT NULL DEFAULT 'Plot No. 33, Block A, Mohan Cooperative Industrial Estate, New Delhi, Delhi - 110044, India',
    "companyGstin" TEXT NOT NULL DEFAULT '07ABEFB8495P1ZL',
    "companyPan" TEXT NOT NULL DEFAULT 'ABEFB8495P',
    "companyState" TEXT NOT NULL DEFAULT 'Delhi',
    "companyStateCode" TEXT NOT NULL DEFAULT '07',
    "legalName" TEXT NOT NULL DEFAULT 'BIG BAJAAR ECOM STOREE',
    "shiprocketConnected" BOOLEAN NOT NULL DEFAULT false,
    "shiprocketEmail" TEXT NOT NULL DEFAULT '',
    "shiprocketPassword" TEXT NOT NULL DEFAULT '',
    "shiprocketPickup" TEXT NOT NULL DEFAULT '',
    "shiprocketToken" TEXT NOT NULL DEFAULT '',
    "shiprocketTokenExp" TIMESTAMP(3),
    "shiprocketPickupPin" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Damaged',
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "resolution" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "proofRequest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "public"."Address"("customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug" ASC);

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "public"."Category"("sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "public"."Coupon"("code" ASC);

-- CreateIndex
CREATE INDEX "Coupon_customerId_idx" ON "public"."Coupon"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Coupon_orderId_idx" ON "public"."Coupon"("orderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "public"."Customer"("email" ASC);

-- CreateIndex
CREATE INDEX "EventLog_action_idx" ON "public"."EventLog"("action" ASC);

-- CreateIndex
CREATE INDEX "EventLog_actor_idx" ON "public"."EventLog"("actor" ASC);

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "public"."EventLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "EventLog_level_idx" ON "public"."EventLog"("level" ASC);

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "public"."Order"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status" ASC);

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "public"."Product"("active" ASC);

-- CreateIndex
CREATE INDEX "Product_asin_idx" ON "public"."Product"("asin" ASC);

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "public"."Product"("category" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "public"."Product"("slug" ASC);

-- CreateIndex
CREATE INDEX "Review_customerId_idx" ON "public"."Review"("customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_productId_key" ON "public"."Review"("orderId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "Review_productSlug_idx" ON "public"."Review"("productSlug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "public"."Subscriber"("email" ASC);

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "public"."Ticket"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Ticket_customerId_idx" ON "public"."Ticket"("customerId" ASC);

-- CreateIndex
CREATE INDEX "Ticket_orderId_idx" ON "public"."Ticket"("orderId" ASC);

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "public"."Ticket"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "public"."Ticket"("ticketNumber" ASC);

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "public"."TicketMessage"("ticketId" ASC);

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

