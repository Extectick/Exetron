# Security Hardening

## Current Controls

- JWT access/refresh flow
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

- kiosk public bootstrap still depends on `deviceId` rather than signed public token
- simulated payment providers remain in place; no acquiring/webhook verification path exists yet
- feature flags and customization rules use JSON payloads without versioned approval workflow
- owner analytics still read directly from operational tables

## Next Security Steps

- add signed kiosk bootstrap tokens or device public session keys
- move secrets to managed secret storage
- add rate limiting and auth anomaly monitoring
- add dedicated non-superuser RLS policy regression tests
