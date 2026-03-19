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
- `GET /localization/preferences`
- `PUT /localization/preferences/tenant`
- `PUT /localization/preferences/store`
- `GET /localization/country-profiles`
- `PUT /localization/country-profiles/:countryCode`
- `GET|PUT /localization/content`
- `GET|PUT /localization/templates`
- `GET /localization/context`
- `GET /localization/language-pack`
- `POST /localization/language-pack/import`
- `POST /localization/templates/render`
- `GET /analytics/owner-cabinet`
- `GET|POST /analytics/snapshots`
- `POST /analytics/precompute`
- `GET /customers/profiles`
- `GET /customers/profiles/:id`
- `GET /customers/profiles/:id/loyalty`
- `POST /customers/profiles/:id/loyalty/adjust`
- `GET|POST /customers/promotions`
- `PATCH /customers/promotions/:id`
- `GET /storefront/bootstrap`
- `POST /storefront/customer-sessions`
- `GET /storefront/customer-sessions/orders`
- `POST /storefront/customer-sessions/orders/:id/repeat`
- `POST /storefront/carts`
- `GET|PATCH /storefront/carts/:id`
- `PATCH /storefront/carts/:id/fulfillment`
- `PATCH /storefront/carts/:id/promotion`
- `POST /storefront/carts/:id/items`
- `PATCH|DELETE /storefront/carts/:id/items/:itemId`
- `POST /storefront/carts/:id/checkout`
- `GET /storefront/orders/:id/tracking`
- `POST /storefront/qr-links`
- `GET /storefront/qr/:token`
- `GET /fulfillment/config`
- `PUT /fulfillment/config/store`
- `GET /fulfillment/dispatch-board`
- `GET /fulfillment/orders/:id`
- `POST /fulfillment/orders/:id/assignment`
- `POST /fulfillment/orders/:id/eta`
- `POST /fulfillment/orders/:id/status`
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
- `GET /localization/context` exposes the resolved locale, fallback locale, country,
  currency, tax metadata, compliance flags and formatting previews for the requested
  tenant/store/channel context.
- `GET /catalog/compiled` now returns localization metadata alongside the catalog so
  channel runtimes can distinguish resolved locale/country/currency context from raw
  pricing numbers.
- Public storefront runtime uses signed access tokens for carts, customer sessions,
  QR links, and order tracking; only `POST /storefront/qr-links` stays protected,
  while the remaining storefront endpoints validate the appropriate public token shape.
- PHASE 13 reuses the existing `DELIVERY` order channel for public online commerce
  instead of creating a parallel storefront-only order lifecycle.
- Customer-facing status updates are surfaced through `GET /storefront/orders/:id/tracking`
  and are derived from canonical order events plus queued storefront notification events.
- PHASE 14 adds `PATCH /storefront/carts/:id/fulfillment` so public carts can resolve
  delivery fees, pickup promises, or dine-in table assignment before checkout.
- Fulfillment operator APIs stay protected and work on top of the existing order
  runtime: config is store-scoped, while assignment/ETA/status updates append new
  fulfillment events and update the current order fulfillment snapshot.
- PHASE 15 adds tenant-scoped customer profiles, loyalty ledger/accounts, protected
  promotion management APIs, and public storefront endpoints for promotion apply
  plus repeat-order bootstrapping.
- `GET /storefront/bootstrap` now optionally returns public customer growth context
  (`customerProfile`, `availablePromotions`) for signed customer sessions, while
  order checkout can attach `customerProfileId`, `discountTotal`, and applied
  promotion snapshot onto canonical cart/order DTOs.
