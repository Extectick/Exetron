# Exetron

Exetron is a multi-tenant SaaS platform for offline business automation. This
repository implements the baseline `PHASE 0 -> PHASE 10` plan and active
post-baseline work through `PHASE 13` from
`roadmap_task_ai_master_spec`.

## Workspace

- `apps/api` - NestJS modular monolith and platform core REST API
- `apps/web` - Next.js admin control plane, owner cabinet, payment admin pages, public kiosk UI, and public storefront/tracking pages
- `apps/mobile` - Expo POS runtime with offline-lite cache, queue replay, and payment processing
- `packages/config` - shared environment contracts
- `packages/contracts` - shared DTO and API shapes
- `packages/database` - Prisma schema, migrations, generated client, seed data
- `packages/types` - shared primitive types and request context
- `roadmap_task_ai_master_spec` - source of truth for planning and progress notes

Current implemented scope includes:
- PHASE 0 foundation and monorepo bootstrap
- PHASE 1 platform core: auth, tenants, stores, users, roles, devices, audit, settings, feature flags
- PHASE 2 catalog/pricing: categories, products, variants, modifiers, price lists, store overrides, compiled catalog, price preview
- PHASE 3 orders core: carts, checkout, order lifecycle transitions, order events, kitchen handoff contract
- PHASE 4 POS runtime: shifts, POS sessions, POS bootstrap, split payment intent capture, offline-lite mobile queue sync
- PHASE 5 kitchen & board: kitchen tickets, station routing basics, realtime board feed, thin kitchen/order-board web pages
- PHASE 6 kiosk: public kiosk bootstrap, branded self-service UI, kiosk checkout, kitchen integration
- PHASE 7 payments: canonical payment abstraction, provider configs, payment attempts, reconciliation summary, kiosk/POS payment unification
- PHASE 8 analytics: owner cabinet dashboard, revenue summaries, store comparison, top products, and report snapshots
- PHASE 9 customization: branding configs, customization rules, effective evaluation, and channel/point-specific behavior
- PHASE 10 hardening: structured logs, request ids, readiness/metrics endpoints, CI/CD gates, and production ops docs
- PHASE 11 product maturity: signed kiosk access tokens, platform-admin onboarding bootstrap, encrypted provider-config secrets handling, observability boundary, and analytics precompute basics
- PHASE 12 globalization foundation: localization service, locale precedence, country profiles, localized catalog content, language-pack import/export, and localized template rendering
- PHASE 13 online commerce channel: public storefront bootstrap, guest/customer carts and checkout, QR ordering links, signed tracking access, and customer notification hooks

## Quick Start

1. Copy `.env.example` to `.env`.
2. Ensure Docker Desktop is running.
3. Run `corepack pnpm install`.
4. Run `corepack pnpm infra:up`.
5. Run `corepack pnpm db:generate`.
6. Run `corepack pnpm db:deploy` for existing migrations, or `corepack pnpm --filter @exetron/database db:migrate -- --name <migration_name>` while developing new schema changes.
7. Run `corepack pnpm db:seed`.
8. Run `corepack pnpm dev` for API + web, or `corepack pnpm dev:all` to include Expo mobile.

## Verification

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm test:e2e`
- `corepack pnpm test:critical`
- `corepack pnpm build`

Dockerized runtime verification is working with project Postgres on
`localhost:5433`. API unit tests, live Postgres e2e smoke, workspace lint,
typecheck, test and build all pass through PHASE 10.

The root dev launcher automatically selects the next free port when `3000`,
`3001`, or `8081` are already busy and prints the final port map on startup.

For kiosk runtime, register an active `KIOSK` device, issue a kiosk access token via
`POST /devices/:id/kiosk-access-token`, and open
`http://localhost:3000/kiosk/<deviceId>?token=<kioskAccessToken>`.

For fresh environment bootstrap, platform admins can create a tenant, its first
store, and initial devices in one request via `POST /onboarding/bootstrap`.
That flow returns one-time device bootstrap secrets and can optionally issue the
first kiosk public access token for new kiosk devices.

For payment administration, use:
- `/payment-provider-configs`
- `/payments`
- `/payment-reconciliation`

Payment provider configs now separate public `settings` from sensitive
`secrets`: secrets can be submitted through the API, are stored in encrypted
persistence, and are returned only as redacted metadata.

For owner analytics, use:
- `/owner-cabinet`

Owner analytics now support live vs precomputed reads. Use `POST /analytics/precompute`
to generate an owner-cabinet artifact and `GET /analytics/owner-cabinet?mode=...`
to choose `LIVE`, `PREFER_SNAPSHOT`, or `SNAPSHOT_ONLY`.

For customization management, use:
- `/customization`

For localization management, use:
- `/localization`

For public storefront runtime, use:
- `/storefront/<storeCode>`
- `/order-tracking/<orderId>?token=<storefrontTrackingToken>`

Storefront runtime now provides:
- public bootstrap via `GET /storefront/bootstrap`
- guest and customer session flows over the existing commerce core
- public cart and checkout for the `DELIVERY` channel
- protected QR link issuance via `POST /storefront/qr-links`
- signed order tracking access and customer order history lookup

For production hardening and probes, use:
- `/health`
- `/health/live`
- `/health/readiness`
- `/health/metrics`
- `/health/observability`

Operational docs:
- `docs/operations/production-readiness.md`
- `docs/operations/migration-safety-checklist.md`
- `docs/operations/performance-review.md`
- `docs/operations/security-hardening.md`

Localization runtime now provides:
- tenant/store localization preferences
- country profiles with currency, tax metadata, and compliance flags
- localized content overlays for compiled catalog reads
- localized templates with synchronous render preview and language-pack export/import
