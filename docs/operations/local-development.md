# Local Development

## Prerequisites

- Node.js 22+
- `corepack`
- Docker Desktop or another Docker daemon

## Commands

- `corepack pnpm install`
- `corepack pnpm infra:up`
- `corepack pnpm db:generate`
- `corepack pnpm db:deploy`
- `corepack pnpm db:seed`
- `corepack pnpm dev`
- `corepack pnpm dev:mobile`
- `corepack pnpm dev:all`

## Notes

- Root scripts use a repo-local `turbo` launcher plus a local `pnpm` shim so the
  workspace still runs correctly when `pnpm` is only available through `corepack`.
- `corepack pnpm dev` starts API + web. Mobile runs separately by default because
  Expo does not behave reliably inside the same non-interactive parallel process group.
- The dev launcher auto-picks the next free port when `3000`, `3001`, or `8081`
  are already occupied and rewrites API URLs for web/mobile to match the actual API port.
- Project Postgres is published on `localhost:5433` to avoid conflicts with local
  host PostgreSQL instances.
- For new schema work, use `corepack pnpm --filter @exetron/database db:migrate -- --name <migration_name>`.
- Live Docker runtime verification, API smoke e2e and workspace build/test/typecheck
  are already passing in this repository state.
- After creating an active `KIOSK` device, issue a signed kiosk access token via
  `POST /devices/:id/kiosk-access-token`.
- The public kiosk UI is then available at
  `/kiosk/<deviceId>?token=<kioskAccessToken>` on the running web app.
- Payment provider configs can now receive `secrets` through the API; the web
  admin page shows only redacted secret metadata, not the secret values.
- Owner cabinet supports `LIVE`, `PREFER_SNAPSHOT`, and `SNAPSHOT_ONLY` reads,
  and `POST /analytics/precompute` generates the corresponding snapshot artifact.
- Hardening probes are available at `/health`, `/health/live`, `/health/readiness`
  `/health/metrics`, and `/health/observability` on the API.
- Production-oriented checklists live in:
  - `docs/operations/production-readiness.md`
  - `docs/operations/migration-safety-checklist.md`
  - `docs/operations/performance-review.md`
  - `docs/operations/security-hardening.md`
