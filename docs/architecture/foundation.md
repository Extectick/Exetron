# Foundation Architecture

## Monorepo

- Package manager: `pnpm` via `corepack`
- Task orchestration: `Turborepo`
- Apps: `api`, `web`, `mobile`
- Shared packages: `config`, `contracts`, `database`, `types`

## Backend Boundaries

- `auth` - local login, refresh, logout, current session
- `tenants` - tenant lifecycle
- `brands` - tenant brand catalog root
- `categories` - catalog classification tree
- `products` - product cards and variants
- `modifiers` - modifier groups and options
- `pricing` - price lists, store overrides, compiled catalog and preview
- `orders` - carts, order checkout, lifecycle transitions and order events
- `pos` - POS bootstrap, shifts, sessions and payment compatibility wrapper
- `payments` - payment intents, allocations, attempts, provider configs and reconciliation
- `analytics` - owner cabinet aggregates, store comparison, top products and report snapshots
- `customization` - branding configs, customization rules and effective channel/point evaluation
- `observability` - structured logs, request ids, metrics and standardized error handling
- `kitchen` - kitchen tickets, board feed and realtime operational updates
- `kiosk` - public kiosk bootstrap and self-service checkout on top of the payments runtime
- `stores` - store topology and timezone
- `users` - staff identities and memberships
- `roles` - tenant RBAC and permission links
- `devices` - POS, kiosk, kitchen, board registration
- `settings` - tenant/store config layer
- `feature-flags` - tenant/store feature toggles
- `audit` - immutable activity log
- `domain-events` - outbox-backed internal event publishing

## Data Model

Core tables in `packages/database/prisma/schema.prisma`:

- `Tenant`, `Brand`, `Store`
- `User`, `Role`, `Permission`, `UserRole`, `UserStoreAccess`
- `Device`, `RefreshSession`
- `TenantSetting`, `StoreSetting`, `FeatureFlag`
- `CustomizationBrandingConfig`, `CustomizationRule`
- `AuditLog`, `OutboxEvent`
- `Category`, `Product`, `ProductVariant`
- `ModifierGroup`, `ModifierOption`, `ProductModifierGroup`
- `PriceList`, `PriceListItem`, `StoreCatalogOverride`, `AvailabilityWindow`
- `Cart`, `CartItem`, `CartItemModifier`
- `Order`, `OrderItem`, `OrderItemModifier`, `OrderEvent`
- `PosShift`, `PosSession`, `PaymentIntent`, `PaymentAllocation`, `PaymentAttempt`, `PaymentProviderConfig`
- `AnalyticsSnapshot`
- `KitchenTicket`, `KitchenTicketItem`
- `KioskPaymentHandoff`

All tenant-scoped entities carry `tenantId`. Store-scoped entities also carry
`storeId` where appropriate.

## Isolation Strategy

- Application layer guards and tenant resolution enforce access in services.
- PostgreSQL RLS helper functions and policies are created in the baseline
  migration and extended in Phase 2, Phase 3, Phase 4, Phase 5 and Phase 6 for new tenant-scoped tables.
- Request handlers run Prisma work inside `DatabaseContextService` transactions
  that set `app.current_tenant_id`, `app.current_scope`, and `app.current_user_id`.

## Catalog And Pricing

- Catalog compilation is exposed as `GET /catalog/compiled`.
- Price resolution is exposed as `POST /pricing/preview`.
- Availability windows use explicit `targetType + targetId` instead of conditional
  foreign keys, and are resolved in the application layer.
- Pricing precedence is deterministic: store override -> price list -> variant
  base -> product base, then modifier deltas are added on top.

## Orders Core

- Cart runtime is exposed as `GET|POST /carts`, `GET|PATCH /carts/:id`,
  `POST /carts/:id/items`, `PATCH|DELETE /carts/:id/items/:itemId`.
- Checkout is exposed as `POST /carts/:id/checkout`.
- Order runtime is exposed as `GET /orders`, `GET /orders/:id`,
  `POST /orders/:id/transition`, `GET /orders/:id/events`.
- Checkout snapshots product/variant/modifier names and resolved prices into
  order items; later catalog/pricing changes do not mutate historical orders.
- Order lifecycle is explicit: `PLACED -> CONFIRMED -> IN_PREPARATION -> READY
  -> COMPLETED`, with `CANCELLED` as terminal.
- Kitchen handoff in Phase 3 is event-only via `order.kitchen_handoff_requested`;
  Phase 5 adds persistent kitchen tickets and board feed on top of that contract.

## Kitchen And Board

- Kitchen runtime is exposed as `GET /kitchen/tickets`, `GET /kitchen/tickets/:id`,
  `POST /kitchen/tickets/:id/transition`.
- Board runtime is exposed as `GET /board/orders`.
- Kitchen tickets are created when an order reaches `CONFIRMED`.
- Station routing uses `kitchen.routing` config from store settings first, then tenant settings.
- Realtime updates use websocket rooms scoped to `tenant + store`.
- Kitchen transitions can synchronize the canonical order lifecycle to
  `IN_PREPARATION`, `READY`, and `COMPLETED`.

## Payments

- Payment runtime is exposed as:
  - `GET|POST /payments/provider-configs`
  - `PATCH /payments/provider-configs/:id`
  - `GET /payments/intents`
  - `GET /payments/intents/:id`
  - `POST /payments/intents`
  - `POST /payments/intents/:id/allocations/:allocationId/process`
  - `POST /payments/intents/:id/cancel`
  - `GET /payments/intents/:id/attempts`
  - `GET /payments/reconciliation/summary`
- `POST /pos/payment-intents` remains as a compatibility wrapper over the shared payments service.
- Provider configs are tenant/store-scoped and use precedence `store > tenant`.
- Current provider types are `CASH_MANUAL`, `CARD_SIMULATED`, and `QR_SIMULATED`.
- Intent lifecycle is `PENDING -> PARTIALLY_PAID -> COMPLETED | FAILED | CANCELLED`.
- Allocation lifecycle is `PENDING -> COMPLETED | FAILED | CANCELLED`.
- Attempt lifecycle is `PENDING -> SUCCEEDED | FAILED | CANCELLED`.
- Reconciliation is internal only in PHASE 7: intents, allocations and attempts are summarized without external provider webhooks or settlement imports.

## Analytics

- Owner analytics is exposed as:
  - `GET /analytics/owner-cabinet`
  - `GET /analytics/snapshots`
  - `POST /analytics/snapshots`
- PHASE 8 computes revenue from paid orders using completed payment intents, not from kitchen completion.
- Store comparison, top products and channel summary are aggregated on demand from transactional tables.
- `AnalyticsSnapshot` stores persisted owner dashboard payloads for a selected period and optional store scope.
- Current analytics strategy is read-on-demand over operational data; no separate warehouse or materialized projection exists yet.

## Kiosk

- Public kiosk bootstrap is exposed as `GET /kiosk/bootstrap?deviceId=...`.
- Public kiosk checkout is exposed as `POST /kiosk/checkout`.
- Kiosk runtime resolves branding and rules from `kiosk.branding` and
  `kiosk.rules`, preferring store settings over tenant settings.
- Paid kiosk checkout reuses the existing cart/order lifecycle with channel
  `KIOSK` and can auto-confirm the order into the kitchen flow.
- PHASE 7 kiosk checkout no longer writes new `KioskPaymentHandoff` rows and instead
  creates a generic payment intent plus a single processed allocation.

## Event Strategy

- Internal integration stays event-driven inside the modular monolith.
- Domain changes write into `OutboxEvent`.
- `EventEmitter2` is used for in-process event dispatch.

## Offline-Lite And Customization

- PHASE 4 introduces offline-lite for POS as cached bootstrap + pending queue replay.
- Orders are still submitted to the existing backend APIs; there is no local-first authoritative store yet.
- PHASE 7 extends POS from payment intent capture to actual allocation processing, but still without real acquiring integration or refunds.
- PHASE 6 kiosk runtime is web/PWA-first and stays online-first; it does not yet
  add kiosk-specific offline queueing or device-token hardening.
- PHASE 9 adds a formal `customization` runtime on top of `settings` and
  `feature-flags`, with branding configs plus a simple deterministic rules executor.
- Effective customization is exposed as `POST /customization/evaluate`, while
  management APIs cover `GET|POST|PATCH /customization/branding` and
  `GET|POST|PATCH /customization/rules`.
- Kiosk bootstrap and checkout now resolve branding/rules through this
  customization layer instead of reading raw settings directly.

## Hardening And Operations

- API now exposes:
  - `GET /health`
  - `GET /health/live`
  - `GET /health/readiness`
  - `GET /health/metrics`
- Request ids are attached via middleware and returned as `x-request-id`.
- Global exception handling returns standardized envelopes with `statusCode`,
  `timestamp`, `path`, `requestId`, `error`, and `message`.
- Structured logs are emitted as JSON lines from the API runtime.
- Current metrics are process-local and in-memory; they are sufficient for
  single-instance hardening but should move to an external metrics/tracing stack
  when the deployment becomes multi-instance.
