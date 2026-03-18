# Production Readiness

## Scope

PHASE 10 hardening covers:
- structured JSON logs in API runtime
- request ids and standardized error envelopes
- liveness, readiness and metrics endpoints
- CI pipeline with build, unit and live Postgres e2e gates
- release artifact packaging on protected branch pushes
- migration safety and rollback checklists
- baseline performance and security review notes

## Runtime Endpoints

- `GET /health`
- `GET /health/live`
- `GET /health/readiness`
- `GET /health/metrics`

## Release Gate

Before production promotion:
1. `corepack pnpm lint`
2. `corepack pnpm typecheck`
3. `corepack pnpm test`
4. `corepack pnpm test:e2e`
5. `corepack pnpm build`
6. `corepack pnpm db:deploy`
7. Run manual smoke on login, catalog bootstrap, POS payment, kiosk checkout, kitchen board and owner cabinet

## Deployment Strategy

- Build API and web artifacts from the monorepo in CI.
- Apply Prisma migrations before rotating traffic.
- Start new application instances with the same environment revision.
- Verify `GET /health/readiness` before switching traffic.
- Use `GET /health/metrics` and structured logs to validate the rollout window.

## Environment Baseline

Required production concerns:
- strong JWT secrets
- externalized Postgres backups
- managed Redis or equivalent
- S3-compatible object storage credentials outside repo
- HTTPS termination in front of API and web
- secret rotation policy for platform admin and payment/provider credentials
