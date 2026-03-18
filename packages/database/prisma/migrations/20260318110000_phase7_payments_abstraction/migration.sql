-- AlterEnum
ALTER TYPE "PaymentIntentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "PaymentIntentStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- CreateEnum
DO $$
BEGIN
  CREATE TYPE "PaymentAllocationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentProviderType" AS ENUM ('CASH_MANUAL', 'CARD_SIMULATED', 'QR_SIMULATED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "PaymentIntent"
  ADD COLUMN IF NOT EXISTS "channel" "OrderChannel",
  ADD COLUMN IF NOT EXISTS "deviceId" UUID,
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "PaymentIntent"
SET "channel" = COALESCE("channel", 'POS'::"OrderChannel");

ALTER TABLE "PaymentIntent"
  ALTER COLUMN "channel" SET NOT NULL,
  ALTER COLUMN "posSessionId" DROP NOT NULL,
  ALTER COLUMN "shiftId" DROP NOT NULL,
  ALTER COLUMN "createdByUserId" DROP NOT NULL;

ALTER TABLE "PaymentAllocation"
  ADD COLUMN IF NOT EXISTS "status" "PaymentAllocationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "providerKey" TEXT,
  ADD COLUMN IF NOT EXISTS "externalReference" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

-- Refresh foreign keys for nullable intent relations
ALTER TABLE "PaymentIntent" DROP CONSTRAINT IF EXISTS "PaymentIntent_posSessionId_fkey";
ALTER TABLE "PaymentIntent" DROP CONSTRAINT IF EXISTS "PaymentIntent_shiftId_fkey";
ALTER TABLE "PaymentIntent" DROP CONSTRAINT IF EXISTS "PaymentIntent_createdByUserId_fkey";
ALTER TABLE "PaymentIntent" DROP CONSTRAINT IF EXISTS "PaymentIntent_deviceId_fkey";

ALTER TABLE "PaymentIntent"
  ADD CONSTRAINT "PaymentIntent_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentIntent_posSessionId_fkey"
    FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentIntent_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentIntent_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id" UUID NOT NULL,
  "paymentIntentId" UUID NOT NULL,
  "paymentAllocationId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "providerKey" TEXT NOT NULL,
  "providerType" "PaymentProviderType" NOT NULL,
  "method" "PaymentMethodKind" NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "externalReference" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentProviderConfig" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "storeId" UUID,
  "providerKey" TEXT NOT NULL,
  "providerType" "PaymentProviderType" NOT NULL,
  "method" "PaymentMethodKind" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "allowedChannels" "OrderChannel"[] NOT NULL,
  "autoConfirmOrderOnSuccess" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentAttempt_tenantId_storeId_createdAt_idx"
  ON "PaymentAttempt"("tenantId", "storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_paymentIntentId_createdAt_idx"
  ON "PaymentAttempt"("paymentIntentId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_paymentAllocationId_createdAt_idx"
  ON "PaymentAttempt"("paymentAllocationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_createdAt_idx"
  ON "PaymentAttempt"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentProviderConfig_tenantId_method_enabled_priority_idx"
  ON "PaymentProviderConfig"("tenantId", "method", "enabled", "priority");
CREATE INDEX IF NOT EXISTS "PaymentProviderConfig_storeId_method_enabled_priority_idx"
  ON "PaymentProviderConfig"("storeId", "method", "enabled", "priority");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_paymentIntentId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_paymentAllocationId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_tenantId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_storeId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_orderId_fkey";
ALTER TABLE "PaymentProviderConfig" DROP CONSTRAINT IF EXISTS "PaymentProviderConfig_tenantId_fkey";
ALTER TABLE "PaymentProviderConfig" DROP CONSTRAINT IF EXISTS "PaymentProviderConfig_storeId_fkey";

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_paymentIntentId_fkey"
    FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentAttempt_paymentAllocationId_fkey"
    FOREIGN KEY ("paymentAllocationId") REFERENCES "PaymentAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentAttempt_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentAttempt_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentProviderConfig"
  ADD CONSTRAINT "PaymentProviderConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PaymentProviderConfig_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentProviderConfig" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS payment_attempt_access_policy ON "PaymentAttempt";
DROP POLICY IF EXISTS payment_provider_config_access_policy ON "PaymentProviderConfig";

CREATE POLICY payment_attempt_access_policy ON "PaymentAttempt"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY payment_provider_config_access_policy ON "PaymentProviderConfig"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));
