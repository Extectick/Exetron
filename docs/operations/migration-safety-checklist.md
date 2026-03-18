# Migration Safety Checklist

## Before Deploy

- Confirm the migration is forward-only and idempotent for `prisma migrate deploy`.
- Check whether the migration adds locks on large tables or rewrites whole rows.
- Verify new nullable columns, defaults and indexes are production-safe.
- Verify new RLS policies with tenant/store scoped smoke tests.
- Run `corepack pnpm db:generate`.
- Run `corepack pnpm db:deploy` against staging-like Postgres.
- Run `corepack pnpm test:e2e` after the migration is applied.

## During Deploy

- Put the application in a controlled rollout window.
- Apply `corepack pnpm db:deploy` before new traffic reaches code that depends on the new schema.
- Watch `GET /health/readiness` and API logs during the migration step.
- Stop rollout immediately on migration failure; do not continue with mixed schema expectations.

## Rollback Strategy

- Prefer application rollback only when the schema change is backward-compatible.
- For non-backward-compatible migrations, do not auto-rollback binaries after traffic starts.
- Restore from backup or run an explicit corrective migration instead of editing applied migrations.
- Keep pre-deploy database backup and migration artifact revision together in the change record.

## After Deploy

- Re-run critical smoke flows.
- Check error rates, latency and failed authorization spikes.
- Verify owner cabinet, payments reconciliation and kitchen board still load with fresh data.
