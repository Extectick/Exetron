CREATE TABLE IF NOT EXISTS "integration_activation_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publication_id" UUID NULL,
  "registry_entry_id" UUID NULL,
  "tenant_id" UUID NULL,
  "organization_id" UUID NULL,
  "target_kind" TEXT NOT NULL DEFAULT 'SUPPLIER_CONNECTOR',
  "connector_key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "request_notes" JSONB NULL,
  "decision_notes" JSONB NULL,
  "activation_artifact" JSONB NULL,
  "requested_by_user_id" UUID NULL,
  "approved_at" TIMESTAMPTZ NULL,
  "rejected_at" TIMESTAMPTZ NULL,
  "applied_at" TIMESTAMPTZ NULL,
  "revoked_at" TIMESTAMPTZ NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "integration_activation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integration_activation_requests_publication_created_idx"
  ON "integration_activation_requests" ("publication_id", "created_at");

CREATE INDEX IF NOT EXISTS "integration_activation_requests_tenant_target_created_idx"
  ON "integration_activation_requests" ("tenant_id", "target_kind", "created_at");

CREATE INDEX IF NOT EXISTS "integration_activation_requests_status_target_created_idx"
  ON "integration_activation_requests" ("status", "target_kind", "created_at");

CREATE INDEX IF NOT EXISTS "integration_activation_requests_connector_version_target_created_idx"
  ON "integration_activation_requests" ("connector_key", "version", "target_kind", "created_at");
