-- CreateEnum
CREATE TYPE "CustomizationChannel" AS ENUM (
  'ADMIN',
  'POS',
  'KIOSK',
  'DELIVERY',
  'KITCHEN',
  'BOARD',
  'BACKOFFICE'
);

-- CreateEnum
CREATE TYPE "CustomizationRuleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CustomizationBrandingConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID,
    "channel" "CustomizationChannel" NOT NULL,
    "pointKey" TEXT,
    "scopeKey" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizationBrandingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID,
    "channel" "CustomizationChannel",
    "pointKey" TEXT,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "status" "CustomizationRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomizationBrandingConfig_scopeKey_key" ON "CustomizationBrandingConfig"("scopeKey");
CREATE INDEX "CustomizationBrandingConfig_tenantId_channel_createdAt_idx" ON "CustomizationBrandingConfig"("tenantId", "channel", "createdAt");
CREATE INDEX "CustomizationBrandingConfig_storeId_channel_createdAt_idx" ON "CustomizationBrandingConfig"("storeId", "channel", "createdAt");
CREATE UNIQUE INDEX "CustomizationRule_tenantId_key_key" ON "CustomizationRule"("tenantId", "key");
CREATE INDEX "CustomizationRule_tenantId_channel_status_priority_idx" ON "CustomizationRule"("tenantId", "channel", "status", "priority");
CREATE INDEX "CustomizationRule_storeId_channel_status_priority_idx" ON "CustomizationRule"("storeId", "channel", "status", "priority");

-- AddForeignKey
ALTER TABLE "CustomizationBrandingConfig" ADD CONSTRAINT "CustomizationBrandingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomizationBrandingConfig" ADD CONSTRAINT "CustomizationBrandingConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomizationRule" ADD CONSTRAINT "CustomizationRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomizationRule" ADD CONSTRAINT "CustomizationRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "CustomizationBrandingConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomizationRule" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS customization_branding_config_access_policy ON "CustomizationBrandingConfig";
DROP POLICY IF EXISTS customization_rule_access_policy ON "CustomizationRule";

CREATE POLICY customization_branding_config_access_policy ON "CustomizationBrandingConfig"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY customization_rule_access_policy ON "CustomizationRule"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));
