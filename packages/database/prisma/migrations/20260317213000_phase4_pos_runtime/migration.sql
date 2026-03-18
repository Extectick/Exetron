-- CreateEnum
CREATE TYPE "PosShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "PaymentMethodKind" AS ENUM ('CASH', 'CARD', 'QR');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PosShift" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "openedByUserId" UUID NOT NULL,
    "status" "PosShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openingCashAmount" DECIMAL(12,2),
    "closingCashAmount" DECIMAL(12,2),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "posSessionId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "paymentIntentId" UUID NOT NULL,
    "method" "PaymentMethodKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosShift_tenantId_storeId_status_openedAt_idx" ON "PosShift"("tenantId", "storeId", "status", "openedAt");
CREATE INDEX "PosShift_deviceId_status_openedAt_idx" ON "PosShift"("deviceId", "status", "openedAt");
CREATE INDEX "PosSession_tenantId_storeId_status_startedAt_idx" ON "PosSession"("tenantId", "storeId", "status", "startedAt");
CREATE INDEX "PosSession_deviceId_status_startedAt_idx" ON "PosSession"("deviceId", "status", "startedAt");
CREATE INDEX "PaymentIntent_tenantId_storeId_status_createdAt_idx" ON "PaymentIntent"("tenantId", "storeId", "status", "createdAt");
CREATE INDEX "PaymentIntent_orderId_createdAt_idx" ON "PaymentIntent"("orderId", "createdAt");
CREATE INDEX "PaymentAllocation_tenantId_paymentIntentId_createdAt_idx" ON "PaymentAllocation"("tenantId", "paymentIntentId", "createdAt");

-- AddForeignKey
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosShift" ADD CONSTRAINT "PosShift_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosSession" ADD CONSTRAINT "PosSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "PosSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "PosShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "PosShift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PosSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAllocation" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS pos_shift_access_policy ON "PosShift";
DROP POLICY IF EXISTS pos_session_access_policy ON "PosSession";
DROP POLICY IF EXISTS payment_intent_access_policy ON "PaymentIntent";
DROP POLICY IF EXISTS payment_allocation_access_policy ON "PaymentAllocation";

CREATE POLICY pos_shift_access_policy ON "PosShift"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY pos_session_access_policy ON "PosSession"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY payment_intent_access_policy ON "PaymentIntent"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY payment_allocation_access_policy ON "PaymentAllocation"
  USING (
    EXISTS (
      SELECT 1
      FROM "PaymentIntent" payment_intent_ref
      WHERE payment_intent_ref."id" = "PaymentAllocation"."paymentIntentId"
        AND app.can_access_tenant(payment_intent_ref."tenantId")
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "PaymentIntent" payment_intent_ref
      WHERE payment_intent_ref."id" = "PaymentAllocation"."paymentIntentId"
        AND app.can_access_tenant(payment_intent_ref."tenantId")
    )
  );
