CREATE TABLE IF NOT EXISTS "inventory_replenishment_jobs" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "store_id" uuid NULL,
  "warehouse_id" uuid NULL,
  "status" text NOT NULL DEFAULT 'GENERATED',
  "summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "artifact" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_user_id" uuid NULL,
  "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_replenishment_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_replenishment_jobs_tenant_id_created_at_idx"
  ON "inventory_replenishment_jobs" ("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "inventory_replenishment_jobs_warehouse_id_status_created_at_idx"
  ON "inventory_replenishment_jobs" ("warehouse_id", "status", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_replenishment_jobs_tenant_id_fkey'
  ) THEN
    ALTER TABLE "inventory_replenishment_jobs"
      ADD CONSTRAINT "inventory_replenishment_jobs_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_replenishment_jobs_store_id_fkey'
  ) THEN
    ALTER TABLE "inventory_replenishment_jobs"
      ADD CONSTRAINT "inventory_replenishment_jobs_store_id_fkey"
      FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_replenishment_jobs_warehouse_id_fkey'
  ) THEN
    ALTER TABLE "inventory_replenishment_jobs"
      ADD CONSTRAINT "inventory_replenishment_jobs_warehouse_id_fkey"
      FOREIGN KEY ("warehouse_id") REFERENCES "inventory_warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
