# Platform Core API

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Platform Resources

- `POST /onboarding/bootstrap`
- `GET|POST|PATCH /tenants`
- `GET|POST|PATCH /brands`
- `GET|POST|PATCH /stores`
- `GET|POST|PATCH /users`
- `GET|POST|PATCH /roles`
- `GET /permissions`
- `GET|POST|PATCH /devices`
- `GET /audit`
- `GET|PUT /settings/tenant`
- `GET /settings/stores/:id`
- `PUT /settings/store`
- `GET|PUT /feature-flags`
- `GET /analytics/owner-cabinet`
- `GET|POST /analytics/snapshots`
- `POST /analytics/precompute`
- `GET /health`
- `GET /health/live`
- `GET /health/readiness`
- `GET /health/metrics`
- `GET /health/observability`

## Contracts

- Canonical DTOs live in `packages/contracts`.
- OpenAPI is exposed by the Nest app at `/docs`.
- JWT claims include `sub`, `tenantId`, `scope`, `roleIds`, `storeIds`, and
  optional device context.
- `POST /onboarding/bootstrap` is platform-admin only and composes the initial
  `tenant -> store -> device[]` bootstrap flow, including one-time device
  bootstrap secrets and optional kiosk access token issuance.
- `POST|PATCH /payments/provider-configs` accept optional `secrets`, but
  `GET /payments/provider-configs` returns only public `settings` plus redacted
  secret metadata.
- `POST /analytics/precompute` creates an inline-now, async-ready owner-cabinet
  artifact and persists it as an analytics snapshot.
- `GET /analytics/owner-cabinet` supports `mode=LIVE|PREFER_SNAPSHOT|SNAPSHOT_ONLY`
  and returns source metadata so UI/runtime can distinguish live vs precomputed reads.
- `GET /health/observability` exposes the current observability exporter boundary
  and the configured external metrics/tracing/alert path.
