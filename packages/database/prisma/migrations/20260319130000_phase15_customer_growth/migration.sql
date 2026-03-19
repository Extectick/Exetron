CREATE TYPE "CustomerProfileStatus" AS ENUM ('ACTIVE', 'MERGED', 'ARCHIVED');
CREATE TYPE "LoyaltyLedgerEntryKind" AS ENUM ('EARN', 'REDEEM', 'ADJUST');
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'LOYALTY_REDEEM');

CREATE TABLE "CustomerProfile" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "preferredStoreId" UUID,
  "fullName" TEXT,
  "phone" TEXT NOT NULL,
  "phoneNormalized" TEXT NOT NULL,
  "status" "CustomerProfileStatus" NOT NULL DEFAULT 'ACTIVE',
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "completedOrderCount" INTEGER NOT NULL DEFAULT 0,
  "totalSpent" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "lastOrderAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "segments" JSONB,
  "retentionState" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyAccount" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "customerProfileId" UUID NOT NULL,
  "pointsBalance" INTEGER NOT NULL DEFAULT 0,
  "totalEarnedPoints" INTEGER NOT NULL DEFAULT 0,
  "totalRedeemedPoints" INTEGER NOT NULL DEFAULT 0,
  "tierKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyLedgerEntry" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "customerProfileId" UUID NOT NULL,
  "loyaltyAccountId" UUID NOT NULL,
  "orderId" UUID,
  "entryKind" "LoyaltyLedgerEntryKind" NOT NULL,
  "points" INTEGER NOT NULL,
  "amount" DECIMAL(12, 2),
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionCampaign" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "storeId" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
  "type" "PromotionType" NOT NULL,
  "value" DECIMAL(12, 2) NOT NULL,
  "minimumOrderTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "maxDiscountAmount" DECIMAL(12, 2),
  "pointsCost" INTEGER,
  "segmentKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "activeFrom" TIMESTAMP(3),
  "activeTo" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cart"
ADD COLUMN "customerProfileId" UUID,
ADD COLUMN "discountTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN "promotionCode" TEXT,
ADD COLUMN "promotionSnapshot" JSONB;

ALTER TABLE "Order"
ADD COLUMN "customerProfileId" UUID,
ADD COLUMN "discountTotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN "promotionCode" TEXT,
ADD COLUMN "promotionSnapshot" JSONB;

CREATE UNIQUE INDEX "CustomerProfile_tenantId_phoneNormalized_key" ON "CustomerProfile"("tenantId", "phoneNormalized");
CREATE INDEX "CustomerProfile_tenantId_preferredStoreId_status_idx" ON "CustomerProfile"("tenantId", "preferredStoreId", "status");
CREATE INDEX "CustomerProfile_tenantId_lastOrderAt_idx" ON "CustomerProfile"("tenantId", "lastOrderAt");

CREATE UNIQUE INDEX "LoyaltyAccount_customerProfileId_key" ON "LoyaltyAccount"("customerProfileId");
CREATE INDEX "LoyaltyAccount_tenantId_pointsBalance_idx" ON "LoyaltyAccount"("tenantId", "pointsBalance");

CREATE UNIQUE INDEX "LoyaltyLedgerEntry_orderId_entryKind_key" ON "LoyaltyLedgerEntry"("orderId", "entryKind");
CREATE INDEX "LoyaltyLedgerEntry_tenantId_customerProfileId_createdAt_idx" ON "LoyaltyLedgerEntry"("tenantId", "customerProfileId", "createdAt");

CREATE UNIQUE INDEX "PromotionCampaign_tenantId_code_key" ON "PromotionCampaign"("tenantId", "code");
CREATE INDEX "PromotionCampaign_tenantId_storeId_status_activeFrom_activeTo_idx" ON "PromotionCampaign"("tenantId", "storeId", "status", "activeFrom", "activeTo");

CREATE INDEX "Cart_tenantId_customerProfileId_createdAt_idx" ON "Cart"("tenantId", "customerProfileId", "createdAt");
CREATE INDEX "Order_tenantId_customerProfileId_placedAt_idx" ON "Order"("tenantId", "customerProfileId", "placedAt");

ALTER TABLE "CustomerProfile"
ADD CONSTRAINT "CustomerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CustomerProfile_preferredStoreId_fkey" FOREIGN KEY ("preferredStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyAccount"
ADD CONSTRAINT "LoyaltyAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "LoyaltyAccount_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoyaltyLedgerEntry"
ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "LoyaltyLedgerEntry_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "LoyaltyLedgerEntry_loyaltyAccountId_fkey" FOREIGN KEY ("loyaltyAccountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "LoyaltyLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PromotionCampaign"
ADD CONSTRAINT "PromotionCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "PromotionCampaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Cart"
ADD CONSTRAINT "Cart_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
