-- CreateEnum
CREATE TYPE "KioskPaymentHandoffStatus" AS ENUM ('INITIATED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "KioskPaymentHandoff" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "method" "PaymentMethodKind" NOT NULL,
    "status" "KioskPaymentHandoffStatus" NOT NULL DEFAULT 'INITIATED',
    "amount" DECIMAL(12,2) NOT NULL,
    "provider" TEXT NOT NULL,
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "KioskPaymentHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KioskPaymentHandoff_tenantId_storeId_createdAt_idx" ON "KioskPaymentHandoff"("tenantId", "storeId", "createdAt");
CREATE INDEX "KioskPaymentHandoff_deviceId_createdAt_idx" ON "KioskPaymentHandoff"("deviceId", "createdAt");
CREATE INDEX "KioskPaymentHandoff_orderId_createdAt_idx" ON "KioskPaymentHandoff"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "KioskPaymentHandoff" ADD CONSTRAINT "KioskPaymentHandoff_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KioskPaymentHandoff" ADD CONSTRAINT "KioskPaymentHandoff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KioskPaymentHandoff" ADD CONSTRAINT "KioskPaymentHandoff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KioskPaymentHandoff" ADD CONSTRAINT "KioskPaymentHandoff_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "KioskPaymentHandoff" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS kiosk_payment_handoff_access_policy ON "KioskPaymentHandoff";

CREATE POLICY kiosk_payment_handoff_access_policy ON "KioskPaymentHandoff"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));
