ALTER TABLE "integration_distribution_requests"
  ADD COLUMN IF NOT EXISTS "granted_consumer_key" TEXT,
  ADD COLUMN IF NOT EXISTS "grant_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "integration_distribution_requests_grant_expires_at_status_idx"
  ON "integration_distribution_requests" ("grant_expires_at", "status");
