CREATE TABLE IF NOT EXISTS "integration_distribution_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publication_id" UUID NOT NULL,
  "connector_key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "requested_channel" TEXT NULL,
  "company_name" TEXT NOT NULL,
  "contact_name" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "intended_use" JSONB NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decision_notes" JSONB NULL,
  "access_token" TEXT NULL,
  "approved_at" TIMESTAMPTZ NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "integration_distribution_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_distribution_requests_access_token_key"
  ON "integration_distribution_requests" ("access_token")
  WHERE "access_token" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "integration_distribution_requests_publication_id_created_at_idx"
  ON "integration_distribution_requests" ("publication_id", "created_at");

CREATE INDEX IF NOT EXISTS "integration_distribution_requests_status_created_at_idx"
  ON "integration_distribution_requests" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "integration_distribution_requests_connector_key_version_created_at_idx"
  ON "integration_distribution_requests" ("connector_key", "version", "created_at");
