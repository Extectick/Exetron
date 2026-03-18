-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "storeId" UUID,
    "kind" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_kind_createdAt_idx" ON "AnalyticsSnapshot"("tenantId", "kind", "createdAt");
CREATE INDEX "AnalyticsSnapshot_storeId_kind_createdAt_idx" ON "AnalyticsSnapshot"("storeId", "kind", "createdAt");
CREATE INDEX "AnalyticsSnapshot_periodStart_periodEnd_idx" ON "AnalyticsSnapshot"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EnableRls
ALTER TABLE "AnalyticsSnapshot" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS analytics_snapshot_access_policy ON "AnalyticsSnapshot";

CREATE POLICY analytics_snapshot_access_policy ON "AnalyticsSnapshot"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));
