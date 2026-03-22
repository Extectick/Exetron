CREATE TABLE IF NOT EXISTS "integration_publications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "registry_entry_id" UUID NOT NULL,
  "tenant_id" UUID NULL,
  "organization_id" UUID NULL,
  "connector_key" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'PARTNER',
  "channel" TEXT NOT NULL DEFAULT 'general',
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "package_file_name" TEXT NOT NULL,
  "docs_file_name" TEXT NOT NULL,
  "artifact" JSONB NOT NULL,
  "attestation" JSONB NOT NULL,
  "published_by_user_id" UUID NULL,
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revoked_at" TIMESTAMPTZ NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "integration_publications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integration_publications_registry_entry_id_created_at_idx"
  ON "integration_publications" ("registry_entry_id", "created_at");

CREATE INDEX IF NOT EXISTS "integration_publications_tenant_id_created_at_idx"
  ON "integration_publications" ("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "integration_publications_organization_id_created_at_idx"
  ON "integration_publications" ("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "integration_publications_connector_key_version_created_at_idx"
  ON "integration_publications" ("connector_key", "version", "created_at");

CREATE TABLE IF NOT EXISTS "integration_publication_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publication_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL,
  "actor_key" TEXT NULL,
  "metadata" JSONB NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "integration_publication_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integration_publication_events_publication_id_created_at_idx"
  ON "integration_publication_events" ("publication_id", "created_at");

CREATE INDEX IF NOT EXISTS "integration_publication_events_event_type_created_at_idx"
  ON "integration_publication_events" ("event_type", "created_at");
