-- Phase 16: payment extensions and hardware connectors
CREATE TABLE IF NOT EXISTS "PaymentOperation" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "paymentIntentId" UUID NOT NULL,
  "paymentAllocationId" UUID NULL,
  "orderId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "providerKey" TEXT NOT NULL,
  "externalReference" TEXT NULL,
  "reason" TEXT NULL,
  "requestPayload" JSONB NULL,
  "responsePayload" JSONB NULL,
  "createdByUserId" UUID NULL,
  "processedAt" TIMESTAMPTZ NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PaymentSettlement" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "storeId" UUID NULL,
  "providerKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "periodStart" TIMESTAMPTZ NOT NULL,
  "periodEnd" TIMESTAMPTZ NOT NULL,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "settledAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "summary" JSONB NULL,
  "importedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "storeId" UUID NULL,
  "providerKey" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "signatureValid" BOOLEAN NOT NULL DEFAULT FALSE,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMPTZ NULL,
  "failureReason" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ConnectorExecutionLog" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "storeId" UUID NULL,
  "connectorKind" TEXT NOT NULL,
  "connectorKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestPayload" JSONB NULL,
  "responsePayload" JSONB NULL,
  "errorMessage" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finishedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS "HardwareJob" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "orderId" UUID NULL,
  "deviceId" UUID NULL,
  "connectorKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestPayload" JSONB NULL,
  "resultPayload" JSONB NULL,
  "failureReason" TEXT NULL,
  "createdByUserId" UUID NULL,
  "finishedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "HardwareReceipt" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "hardwareJobId" UUID NULL,
  "orderId" UUID NULL,
  "receiptType" TEXT NOT NULL,
  "externalReference" TEXT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "HardwareSession" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "deviceId" UUID NULL,
  "connectorKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "sessionToken" TEXT NULL,
  "metadata" JSONB NULL,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_providerKey_deliveryId_key" ON "PaymentWebhookEvent" ("providerKey", "deliveryId");
CREATE UNIQUE INDEX IF NOT EXISTS "HardwareReceipt_hardwareJobId_key" ON "HardwareReceipt" ("hardwareJobId");
CREATE INDEX IF NOT EXISTS "PaymentOperation_tenantId_storeId_kind_createdAt_idx" ON "PaymentOperation" ("tenantId", "storeId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentOperation_paymentIntentId_createdAt_idx" ON "PaymentOperation" ("paymentIntentId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentOperation_orderId_createdAt_idx" ON "PaymentOperation" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentSettlement_tenantId_providerKey_createdAt_idx" ON "PaymentSettlement" ("tenantId", "providerKey", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentSettlement_storeId_createdAt_idx" ON "PaymentSettlement" ("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_tenantId_createdAt_idx" ON "PaymentWebhookEvent" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_storeId_createdAt_idx" ON "PaymentWebhookEvent" ("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "ConnectorExecutionLog_tenantId_connectorKind_createdAt_idx" ON "ConnectorExecutionLog" ("tenantId", "connectorKind", "createdAt");
CREATE INDEX IF NOT EXISTS "ConnectorExecutionLog_storeId_connectorKind_createdAt_idx" ON "ConnectorExecutionLog" ("storeId", "connectorKind", "createdAt");
CREATE INDEX IF NOT EXISTS "HardwareJob_tenantId_storeId_kind_createdAt_idx" ON "HardwareJob" ("tenantId", "storeId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "HardwareJob_orderId_createdAt_idx" ON "HardwareJob" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "HardwareReceipt_tenantId_storeId_createdAt_idx" ON "HardwareReceipt" ("tenantId", "storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "HardwareReceipt_orderId_createdAt_idx" ON "HardwareReceipt" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "HardwareSession_tenantId_storeId_createdAt_idx" ON "HardwareSession" ("tenantId", "storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "HardwareSession_deviceId_createdAt_idx" ON "HardwareSession" ("deviceId", "createdAt");

ALTER TABLE "PaymentOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConnectorExecutionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HardwareJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HardwareReceipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HardwareSession" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_operation_access_policy ON "PaymentOperation";
DROP POLICY IF EXISTS payment_settlement_access_policy ON "PaymentSettlement";
DROP POLICY IF EXISTS payment_webhook_event_access_policy ON "PaymentWebhookEvent";
DROP POLICY IF EXISTS connector_execution_log_access_policy ON "ConnectorExecutionLog";
DROP POLICY IF EXISTS hardware_job_access_policy ON "HardwareJob";
DROP POLICY IF EXISTS hardware_receipt_access_policy ON "HardwareReceipt";
DROP POLICY IF EXISTS hardware_session_access_policy ON "HardwareSession";

CREATE POLICY payment_operation_access_policy ON "PaymentOperation"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY payment_settlement_access_policy ON "PaymentSettlement"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY payment_webhook_event_access_policy ON "PaymentWebhookEvent"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY connector_execution_log_access_policy ON "ConnectorExecutionLog"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY hardware_job_access_policy ON "HardwareJob"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY hardware_receipt_access_policy ON "HardwareReceipt"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY hardware_session_access_policy ON "HardwareSession"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

-- Phase 17: billing bounded context
CREATE TABLE IF NOT EXISTS "BillingPlan" (
  "id" UUID NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "priceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "intervalKey" TEXT NOT NULL DEFAULT 'MONTHLY',
  "entitlements" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "quotas" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ResellerAccount" (
  "id" UUID NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BillingAccount" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "resellerAccountId" UUID NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "defaultPaymentTerms" TEXT NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TRIAL',
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "currentPeriodStart" TIMESTAMPTZ NOT NULL,
  "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
  "cancelledAt" TIMESTAMPTZ NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "dueAt" TIMESTAMPTZ NULL,
  "issuedAt" TIMESTAMPTZ NULL,
  "paidAt" TIMESTAMPTZ NULL,
  "lines" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EntitlementGrant" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "key" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NULL,
  "value" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "QuotaCounter" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "key" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NULL,
  "limitValue" INTEGER NOT NULL,
  "usedValue" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "TrialGrant" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endsAt" TIMESTAMPTZ NOT NULL,
  "convertedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingPlan_code_key" ON "BillingPlan" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ResellerAccount_code_key" ON "ResellerAccount" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingAccount_tenantId_key" ON "BillingAccount" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice" ("number");
CREATE UNIQUE INDEX IF NOT EXISTS "EntitlementGrant_scope_key" ON "EntitlementGrant" ("tenantId", "key", "scopeType", "scopeId");
CREATE UNIQUE INDEX IF NOT EXISTS "QuotaCounter_scope_key" ON "QuotaCounter" ("tenantId", "key", "scopeType", "scopeId");
CREATE UNIQUE INDEX IF NOT EXISTS "TrialGrant_tenantId_key" ON "TrialGrant" ("tenantId");
CREATE INDEX IF NOT EXISTS "Subscription_tenantId_status_createdAt_idx" ON "Subscription" ("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Subscription_billingAccountId_createdAt_idx" ON "Subscription" ("billingAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_createdAt_idx" ON "Invoice" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_billingAccountId_createdAt_idx" ON "Invoice" ("billingAccountId", "createdAt");

ALTER TABLE "BillingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntitlementGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuotaCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrialGrant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_account_access_policy ON "BillingAccount";
DROP POLICY IF EXISTS subscription_access_policy ON "Subscription";
DROP POLICY IF EXISTS invoice_access_policy ON "Invoice";
DROP POLICY IF EXISTS entitlement_grant_access_policy ON "EntitlementGrant";
DROP POLICY IF EXISTS quota_counter_access_policy ON "QuotaCounter";
DROP POLICY IF EXISTS trial_grant_access_policy ON "TrialGrant";

CREATE POLICY billing_account_access_policy ON "BillingAccount"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY subscription_access_policy ON "Subscription"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY invoice_access_policy ON "Invoice"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY entitlement_grant_access_policy ON "EntitlementGrant"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY quota_counter_access_policy ON "QuotaCounter"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY trial_grant_access_policy ON "TrialGrant"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

-- Phase 18: inventory tables previously bootstrapped at runtime
CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'GENERAL',
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS inventory_ingredients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'UNIT',
  low_stock_threshold NUMERIC(18,4) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  sku TEXT NULL,
  on_hand NUMERIC(18,4) NOT NULL DEFAULT 0,
  reserved NUMERIC(18,4) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(18,4) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS inventory_recipe_boms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NULL,
  ingredient_id TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, variant_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS inventory_receiving_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  received_by TEXT NULL,
  completed_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_receiving_lines (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  unit_cost NUMERIC(18,2) NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  reason TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_stock_reservations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, source_type, source_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS inventory_stock_ledger_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL,
  balance_after NUMERIC(18,4) NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_stop_list_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NULL,
  warehouse_id TEXT NULL,
  ingredient_id TEXT NULL,
  sku TEXT NULL,
  rule_type TEXT NOT NULL,
  threshold NUMERIC(18,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "inventory_warehouses_tenant_id_store_id_created_at_idx" ON inventory_warehouses (tenant_id, store_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_items_tenant_id_warehouse_id_created_at_idx" ON inventory_items (tenant_id, warehouse_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_items_ingredient_id_idx" ON inventory_items (ingredient_id);
CREATE INDEX IF NOT EXISTS "inventory_recipe_boms_tenant_id_product_id_variant_id_idx" ON inventory_recipe_boms (tenant_id, product_id, variant_id);
CREATE INDEX IF NOT EXISTS "inventory_recipe_boms_ingredient_id_idx" ON inventory_recipe_boms (ingredient_id);
CREATE INDEX IF NOT EXISTS "inventory_receiving_records_tenant_id_created_at_idx" ON inventory_receiving_records (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_receiving_records_warehouse_id_created_at_idx" ON inventory_receiving_records (warehouse_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_receiving_lines_record_id_created_at_idx" ON inventory_receiving_lines (record_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_adjustments_tenant_id_warehouse_id_created_at_idx" ON inventory_adjustments (tenant_id, warehouse_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stock_reservations_tenant_id_created_at_idx" ON inventory_stock_reservations (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stock_reservations_source_type_source_id_created_at_idx" ON inventory_stock_reservations (source_type, source_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stock_ledger_entries_tenant_id_warehouse_id_created_at_idx" ON inventory_stock_ledger_entries (tenant_id, warehouse_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stock_ledger_entries_ingredient_id_created_at_idx" ON inventory_stock_ledger_entries (ingredient_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stock_ledger_entries_source_type_source_id_created_at_idx" ON inventory_stock_ledger_entries (source_type, source_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stop_list_rules_tenant_id_store_id_created_at_idx" ON inventory_stop_list_rules (tenant_id, store_id, created_at);
CREATE INDEX IF NOT EXISTS "inventory_stop_list_rules_warehouse_id_ingredient_id_is_active_idx" ON inventory_stop_list_rules (warehouse_id, ingredient_id, is_active);

ALTER TABLE inventory_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_recipe_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_receiving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stop_list_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_warehouses_access_policy ON inventory_warehouses;
DROP POLICY IF EXISTS inventory_ingredients_access_policy ON inventory_ingredients;
DROP POLICY IF EXISTS inventory_items_access_policy ON inventory_items;
DROP POLICY IF EXISTS inventory_recipe_boms_access_policy ON inventory_recipe_boms;
DROP POLICY IF EXISTS inventory_receiving_records_access_policy ON inventory_receiving_records;
DROP POLICY IF EXISTS inventory_adjustments_access_policy ON inventory_adjustments;
DROP POLICY IF EXISTS inventory_stock_reservations_access_policy ON inventory_stock_reservations;
DROP POLICY IF EXISTS inventory_stock_ledger_entries_access_policy ON inventory_stock_ledger_entries;
DROP POLICY IF EXISTS inventory_stop_list_rules_access_policy ON inventory_stop_list_rules;

CREATE POLICY inventory_warehouses_access_policy ON inventory_warehouses
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_ingredients_access_policy ON inventory_ingredients
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_items_access_policy ON inventory_items
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_recipe_boms_access_policy ON inventory_recipe_boms
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_receiving_records_access_policy ON inventory_receiving_records
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_adjustments_access_policy ON inventory_adjustments
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_stock_reservations_access_policy ON inventory_stock_reservations
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_stock_ledger_entries_access_policy ON inventory_stock_ledger_entries
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

CREATE POLICY inventory_stop_list_rules_access_policy ON inventory_stop_list_rules
  USING (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)))
  WITH CHECK (app.is_platform_admin() OR (tenant_id ~* '^[0-9a-f-]{36}$' AND app.can_access_tenant(tenant_id::uuid)));

-- Phase 19: organizations and rollout governance
CREATE TABLE IF NOT EXISTS "Organization" (
  "id" UUID NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "OrganizationMembership" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "roleKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "OrganizationTenantLink" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "roleKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GovernancePolicy" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NOT NULL,
  "policyKey" TEXT NOT NULL,
  "rules" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "RolloutTemplate" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "artifact" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "TemplateApplication" (
  "id" UUID NOT NULL PRIMARY KEY,
  "templateId" UUID NOT NULL,
  "tenantId" UUID NULL,
  "storeId" UUID NULL,
  "appliedVersion" INTEGER NOT NULL,
  "resultSummary" JSONB NULL,
  "appliedByUserId" UUID NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "WhiteLabelPack" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NULL,
  "tenantId" UUID NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "artifact" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PartnerAccount" (
  "id" UUID NOT NULL PRIMARY KEY,
  "organizationId" UUID NULL,
  "tenantId" UUID NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_code_key" ON "Organization" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership" ("organizationId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationTenantLink_organizationId_tenantId_key" ON "OrganizationTenantLink" ("organizationId", "tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "GovernancePolicy_organizationId_policyKey_key" ON "GovernancePolicy" ("organizationId", "policyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "RolloutTemplate_organizationId_code_key" ON "RolloutTemplate" ("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerAccount_code_key" ON "PartnerAccount" ("code");
CREATE INDEX IF NOT EXISTS "TemplateApplication_templateId_createdAt_idx" ON "TemplateApplication" ("templateId", "createdAt");
CREATE INDEX IF NOT EXISTS "TemplateApplication_tenantId_storeId_createdAt_idx" ON "TemplateApplication" ("tenantId", "storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "WhiteLabelPack_organizationId_createdAt_idx" ON "WhiteLabelPack" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "WhiteLabelPack_tenantId_createdAt_idx" ON "WhiteLabelPack" ("tenantId", "createdAt");

ALTER TABLE "OrganizationTenantLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhiteLabelPack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerAccount" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_tenant_link_access_policy ON "OrganizationTenantLink";
DROP POLICY IF EXISTS template_application_access_policy ON "TemplateApplication";
DROP POLICY IF EXISTS white_label_pack_access_policy ON "WhiteLabelPack";
DROP POLICY IF EXISTS partner_account_access_policy ON "PartnerAccount";

CREATE POLICY organization_tenant_link_access_policy ON "OrganizationTenantLink"
  USING (app.is_platform_admin() OR app.can_access_tenant("tenantId"))
  WITH CHECK (app.is_platform_admin() OR app.can_access_tenant("tenantId"));

CREATE POLICY template_application_access_policy ON "TemplateApplication"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY white_label_pack_access_policy ON "WhiteLabelPack"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY partner_account_access_policy ON "PartnerAccount"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

-- Phase 20: enterprise identity, compliance and integration registry
CREATE TABLE IF NOT EXISTS "EnterpriseBillingPlan" (
  "id" UUID NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "priceAmount" TEXT NOT NULL DEFAULT '0.00',
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "intervalKey" TEXT NOT NULL DEFAULT 'MONTHLY',
  "entitlements" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "quotas" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseBillingAccount" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "resellerAccountId" UUID NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "defaultPaymentTerms" TEXT NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseSubscription" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TRIAL',
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "currentPeriodStart" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
  "cancelledAt" TIMESTAMPTZ NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseInvoice" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "subtotalAmount" TEXT NOT NULL,
  "totalAmount" TEXT NOT NULL,
  "dueAt" TIMESTAMPTZ NULL,
  "issuedAt" TIMESTAMPTZ NULL,
  "paidAt" TIMESTAMPTZ NULL,
  "lines" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseEntitlementGrant" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "key" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL DEFAULT 'TENANT',
  "scopeId" TEXT NULL,
  "value" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseQuotaCounter" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "key" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL DEFAULT 'TENANT',
  "scopeId" TEXT NULL,
  "limitValue" INTEGER NOT NULL DEFAULT 0,
  "usedValue" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseTrialGrant" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "subscriptionId" UUID NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endsAt" TIMESTAMPTZ NOT NULL,
  "convertedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EnterpriseIdentityProvider" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "FederatedIdentityLink" (
  "id" UUID NOT NULL PRIMARY KEY,
  "identityProviderId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "externalSubject" TEXT NOT NULL,
  "email" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AdvancedRolePolicy" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "key" TEXT NOT NULL,
  "rules" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AuditExportJob" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "filter" JSONB NULL,
  "artifact" JSONB NULL,
  "createdByUserId" UUID NULL,
  "completedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "CompliancePack" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "controls" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ComplianceEvidenceArtifact" (
  "id" UUID NOT NULL PRIMARY KEY,
  "compliancePackId" UUID NULL,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "key" TEXT NOT NULL,
  "artifact" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SecretRegistryEntry" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "scopeType" TEXT NOT NULL,
  "scopeId" TEXT NULL,
  "key" TEXT NOT NULL,
  "valueEnvelope" JSONB NOT NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "DeploymentVariant" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PartnerSdkContract" (
  "id" UUID NOT NULL PRIMARY KEY,
  "partnerAccountId" UUID NULL,
  "key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "schema" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "IntegrationRegistryEntry" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenantId" UUID NULL,
  "organizationId" UUID NULL,
  "connectorKey" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "manifest" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ConnectorTemplate" (
  "id" UUID NOT NULL PRIMARY KEY,
  "connectorKey" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseBillingPlan_code_key" ON "EnterpriseBillingPlan" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseBillingAccount_tenantId_key" ON "EnterpriseBillingAccount" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseEntitlementGrant_scope_key" ON "EnterpriseEntitlementGrant" ("tenantId", "key", "scopeType", "scopeId");
CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseQuotaCounter_scope_key" ON "EnterpriseQuotaCounter" ("tenantId", "key", "scopeType", "scopeId");
CREATE UNIQUE INDEX IF NOT EXISTS "EnterpriseTrialGrant_tenantId_key" ON "EnterpriseTrialGrant" ("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "FederatedIdentityLink_identityProviderId_externalSubject_key" ON "FederatedIdentityLink" ("identityProviderId", "externalSubject");
CREATE UNIQUE INDEX IF NOT EXISTS "ConnectorTemplate_connectorKey_version_key" ON "ConnectorTemplate" ("connectorKey", "version");
CREATE INDEX IF NOT EXISTS "EnterpriseSubscription_tenantId_status_createdAt_idx" ON "EnterpriseSubscription" ("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "EnterpriseSubscription_billingAccountId_createdAt_idx" ON "EnterpriseSubscription" ("billingAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "EnterpriseInvoice_tenantId_createdAt_idx" ON "EnterpriseInvoice" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "EnterpriseInvoice_billingAccountId_createdAt_idx" ON "EnterpriseInvoice" ("billingAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "EnterpriseIdentityProvider_tenantId_createdAt_idx" ON "EnterpriseIdentityProvider" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "EnterpriseIdentityProvider_organizationId_createdAt_idx" ON "EnterpriseIdentityProvider" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "FederatedIdentityLink_userId_createdAt_idx" ON "FederatedIdentityLink" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdvancedRolePolicy_tenantId_createdAt_idx" ON "AdvancedRolePolicy" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdvancedRolePolicy_organizationId_createdAt_idx" ON "AdvancedRolePolicy" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditExportJob_tenantId_createdAt_idx" ON "AuditExportJob" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditExportJob_organizationId_createdAt_idx" ON "AuditExportJob" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "CompliancePack_tenantId_createdAt_idx" ON "CompliancePack" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "CompliancePack_organizationId_createdAt_idx" ON "CompliancePack" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "ComplianceEvidenceArtifact_compliancePackId_createdAt_idx" ON "ComplianceEvidenceArtifact" ("compliancePackId", "createdAt");
CREATE INDEX IF NOT EXISTS "ComplianceEvidenceArtifact_tenantId_organizationId_createdAt_idx" ON "ComplianceEvidenceArtifact" ("tenantId", "organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecretRegistryEntry_tenantId_createdAt_idx" ON "SecretRegistryEntry" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecretRegistryEntry_organizationId_createdAt_idx" ON "SecretRegistryEntry" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecretRegistryEntry_scopeType_scopeId_idx" ON "SecretRegistryEntry" ("scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "DeploymentVariant_tenantId_createdAt_idx" ON "DeploymentVariant" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "DeploymentVariant_organizationId_createdAt_idx" ON "DeploymentVariant" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerSdkContract_partnerAccountId_createdAt_idx" ON "PartnerSdkContract" ("partnerAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerSdkContract_key_version_idx" ON "PartnerSdkContract" ("key", "version");
CREATE INDEX IF NOT EXISTS "IntegrationRegistryEntry_tenantId_createdAt_idx" ON "IntegrationRegistryEntry" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationRegistryEntry_organizationId_createdAt_idx" ON "IntegrationRegistryEntry" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "IntegrationRegistryEntry_connectorKey_version_idx" ON "IntegrationRegistryEntry" ("connectorKey", "version");

ALTER TABLE "EnterpriseBillingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnterpriseSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnterpriseInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnterpriseEntitlementGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnterpriseQuotaCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnterpriseTrialGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnterpriseIdentityProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FederatedIdentityLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdvancedRolePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditExportJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompliancePack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceEvidenceArtifact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecretRegistryEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeploymentVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntegrationRegistryEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprise_billing_account_access_policy ON "EnterpriseBillingAccount";
DROP POLICY IF EXISTS enterprise_subscription_access_policy ON "EnterpriseSubscription";
DROP POLICY IF EXISTS enterprise_invoice_access_policy ON "EnterpriseInvoice";
DROP POLICY IF EXISTS enterprise_entitlement_grant_access_policy ON "EnterpriseEntitlementGrant";
DROP POLICY IF EXISTS enterprise_quota_counter_access_policy ON "EnterpriseQuotaCounter";
DROP POLICY IF EXISTS enterprise_trial_grant_access_policy ON "EnterpriseTrialGrant";
DROP POLICY IF EXISTS enterprise_identity_provider_access_policy ON "EnterpriseIdentityProvider";
DROP POLICY IF EXISTS federated_identity_link_access_policy ON "FederatedIdentityLink";
DROP POLICY IF EXISTS advanced_role_policy_access_policy ON "AdvancedRolePolicy";
DROP POLICY IF EXISTS audit_export_job_access_policy ON "AuditExportJob";
DROP POLICY IF EXISTS compliance_pack_access_policy ON "CompliancePack";
DROP POLICY IF EXISTS compliance_evidence_artifact_access_policy ON "ComplianceEvidenceArtifact";
DROP POLICY IF EXISTS secret_registry_entry_access_policy ON "SecretRegistryEntry";
DROP POLICY IF EXISTS deployment_variant_access_policy ON "DeploymentVariant";
DROP POLICY IF EXISTS integration_registry_entry_access_policy ON "IntegrationRegistryEntry";

CREATE POLICY enterprise_billing_account_access_policy ON "EnterpriseBillingAccount"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY enterprise_subscription_access_policy ON "EnterpriseSubscription"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY enterprise_invoice_access_policy ON "EnterpriseInvoice"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY enterprise_entitlement_grant_access_policy ON "EnterpriseEntitlementGrant"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY enterprise_quota_counter_access_policy ON "EnterpriseQuotaCounter"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY enterprise_trial_grant_access_policy ON "EnterpriseTrialGrant"
  USING (app.can_access_tenant("tenantId"))
  WITH CHECK (app.can_access_tenant("tenantId"));

CREATE POLICY enterprise_identity_provider_access_policy ON "EnterpriseIdentityProvider"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY federated_identity_link_access_policy ON "FederatedIdentityLink"
  USING (
    app.is_platform_admin() OR EXISTS (
      SELECT 1
      FROM "EnterpriseIdentityProvider" provider_ref
      WHERE provider_ref."id" = "FederatedIdentityLink"."identityProviderId"
        AND (
          app.is_platform_admin()
          OR (provider_ref."tenantId" IS NOT NULL AND app.can_access_tenant(provider_ref."tenantId"))
        )
    )
  )
  WITH CHECK (
    app.is_platform_admin() OR EXISTS (
      SELECT 1
      FROM "EnterpriseIdentityProvider" provider_ref
      WHERE provider_ref."id" = "FederatedIdentityLink"."identityProviderId"
        AND (
          app.is_platform_admin()
          OR (provider_ref."tenantId" IS NOT NULL AND app.can_access_tenant(provider_ref."tenantId"))
        )
    )
  );

CREATE POLICY advanced_role_policy_access_policy ON "AdvancedRolePolicy"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY audit_export_job_access_policy ON "AuditExportJob"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY compliance_pack_access_policy ON "CompliancePack"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY compliance_evidence_artifact_access_policy ON "ComplianceEvidenceArtifact"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY secret_registry_entry_access_policy ON "SecretRegistryEntry"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY deployment_variant_access_policy ON "DeploymentVariant"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));

CREATE POLICY integration_registry_entry_access_policy ON "IntegrationRegistryEntry"
  USING (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")))
  WITH CHECK (app.is_platform_admin() OR ("tenantId" IS NOT NULL AND app.can_access_tenant("tenantId")));
