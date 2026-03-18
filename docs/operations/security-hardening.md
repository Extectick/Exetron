# Security Hardening

## Current Controls

- JWT access/refresh flow
- signed kiosk access tokens for public kiosk bootstrap and checkout
- encrypted payment provider secret envelope with redacted API responses
- explicit observability status surface for internal-vs-external exporter boundary
- tenant isolation in service layer
- PostgreSQL RLS on tenant-scoped tables
- audit log and outbox persistence for critical operations
- device scope separated from user scope
- standardized error envelopes without raw stack traces in responses

## PHASE 10 Hardening List

- keep strong production secrets outside repository and rotate them regularly
- require HTTPS for API and web traffic
- restrict Postgres and Redis to private network access
- run migrations with controlled credentials and backup policy
- review platform-admin usage and limit shared credentials
- watch audit logs for unusual role, payment and device activity
- ensure object storage credentials are not reused across environments
- review CORS origins before internet exposure

## Remaining Risks

- kiosk access tokens are still long-lived signed URLs without dedicated rotation UI or rate limiting
- simulated payment providers remain in place; no acquiring/webhook verification path exists yet
- payment provider secrets currently derive application-level encryption from the API secret set; managed secret storage is still a future step
- feature flags and customization rules use JSON payloads without versioned approval workflow
- owner analytics can now read from precomputed snapshots, but precompute execution still runs inline inside the API process

## Next Security Steps

- move provider and platform secrets to managed secret storage
- add kiosk token rotation UX and token issuance monitoring
- add rate limiting and auth anomaly monitoring
- move observability export from boundary/status-only mode to real external collector wiring in multi-instance environments
- add dedicated non-superuser RLS policy regression tests
