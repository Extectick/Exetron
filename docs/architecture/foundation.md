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
- `customers` - customer profiles, loyalty ledger/accounts, promotion campaigns and repeat-order growth hooks
- `customization` - branding configs, customization rules and effective channel/point evaluation
- `localization` - locale resolution, country profiles, localized content, localized templates and language-pack handling
- `storefront` - public online commerce channel with bootstrap, guest/customer carts, QR entry points and tracking
- `fulfillment` - delivery zones and fees, pickup/dine-in orchestration, dispatch board and courier/ETA state updates
- `observability` - structured logs, request ids, metrics and standardized error handling
- `kitchen` - kitchen tickets, board feed and realtime operational updates
- `kiosk` - signed public kiosk bootstrap and self-service checkout on top of the payments runtime
- `stores` - store topology and timezone
- `users` - staff identities and memberships
- `roles` - tenant RBAC and permission links
- `devices` - POS, kiosk, kitchen, board registration
- `settings` - tenant/store config layer
- `feature-flags` - tenant/store feature toggles
- `audit` - immutable activity log
- `domain-events` - outbox-backed internal event publishing
- `onboarding` - platform-admin bootstrap flow for initial tenant, store and device setup

## Data Model

Core tables in `packages/database/prisma/schema.prisma`:

- `Tenant`, `Brand`, `Store`
- `User`, `Role`, `Permission`, `UserRole`, `UserStoreAccess`
- `Device`, `RefreshSession`
- `TenantSetting`, `StoreSetting`, `FeatureFlag`
- localization registry keys inside `TenantSetting` and `StoreSetting`
- `CustomizationBrandingConfig`, `CustomizationRule`
- `AuditLog`, `OutboxEvent`
- `Category`, `Product`, `ProductVariant`
- `ModifierGroup`, `ModifierOption`, `ProductModifierGroup`
- `PriceList`, `PriceListItem`, `StoreCatalogOverride`, `AvailabilityWindow`
- `Cart`, `CartItem`, `CartItemModifier`
- `Order`, `OrderItem`, `OrderItemModifier`, `OrderEvent`
- `CustomerProfile`, `LoyaltyAccount`, `LoyaltyLedgerEntry`, `PromotionCampaign`
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
- Localization overlays are applied during catalog compilation using centralized
  locale resolution and settings-backed localized content entries.
- Availability windows use explicit `targetType + targetId` instead of conditional
  foreign keys, and are resolved in the application layer.
- Pricing precedence is deterministic: store override -> price list -> variant
  base -> product base, then modifier deltas are added on top.
- Compiled catalog responses now include localization metadata (`locale`,
  `fallbackLocale`, `countryCode`, `currency`, `tax`) so channels can keep
  pricing math and country/formatting context separate.

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
- PHASE 13 public storefront reuses the same cart/order primitives and currently maps
  online commerce onto the existing `DELIVERY` channel rather than introducing a new
  parallel order type.
- Customer-facing progress updates are derived from canonical order transitions plus
  storefront-specific `storefront.status_hook_emitted` and
  `storefront.notification_queued` events written into the existing order event stream.
- PHASE 14 extends carts and orders with a fulfillment snapshot (`mode`, `fee`,
  payload, promised time, ETA and fulfillment status) so totals and tracking can
  include delivery/pickup/dine-in state without forking the core order lifecycle.
- PHASE 15 extends carts and orders with `customerProfileId`, `discountTotal`, and
  applied promotion snapshot so customer growth mechanics stay attached to the
  same canonical commerce primitives instead of spawning a parallel checkout flow.

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
- Provider config persistence now separates public `settings` from sensitive
  `secrets`; secrets are stored in an encrypted envelope and returned to API
  clients only as metadata (`hasSecrets`, keys, updatedAt).
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
- `POST /analytics/precompute` creates owner-cabinet precompute artifacts using
  the same `AnalyticsSnapshot` storage contract and emits explicit precompute events.
- PHASE 8 computes revenue from paid orders using completed payment intents, not from kitchen completion.
- Store comparison, top products and channel summary are aggregated on demand from transactional tables.
- `AnalyticsSnapshot` stores persisted owner dashboard payloads for a selected period and optional store scope.
- Owner-cabinet reads now support `LIVE`, `PREFER_SNAPSHOT`, and `SNAPSHOT_ONLY`
  modes, so the same endpoint can switch between direct transactional reads and
  precomputed snapshot artifacts.
- PHASE 11 keeps precompute execution inline for now, but the artifact contract
  and `analytics.precompute_requested/completed` events define the async worker
  boundary for future iterations.

## Kiosk

- Public kiosk bootstrap is exposed as
  `GET /kiosk/bootstrap?deviceId=...&accessToken=...`.
- Public kiosk checkout is exposed as `POST /kiosk/checkout`.
- Protected kiosk token issuance is exposed as `POST /devices/:id/kiosk-access-token`.
- Kiosk runtime resolves branding and rules from `kiosk.branding` and
  `kiosk.rules`, preferring store settings over tenant settings.
- Paid kiosk checkout reuses the existing cart/order lifecycle with channel
  `KIOSK` and can auto-confirm the order into the kitchen flow.
- Public kiosk bootstrap and checkout now require a signed kiosk access token
  that is scoped to the active kiosk device, tenant, store and device code.
- PHASE 7 kiosk checkout no longer writes new `KioskPaymentHandoff` rows and instead
  creates a generic payment intent plus a single processed allocation.

## Storefront

- Public storefront runtime is exposed as:
  - `GET /storefront/bootstrap`
  - `POST /storefront/customer-sessions`
  - `GET /storefront/customer-sessions/orders`
  - `POST /storefront/carts`
  - `GET|PATCH /storefront/carts/:id`
  - `POST /storefront/carts/:id/items`
  - `PATCH|DELETE /storefront/carts/:id/items/:itemId`
  - `POST /storefront/carts/:id/checkout`
  - `GET /storefront/orders/:id/tracking`
  - `POST /storefront/qr-links`
  - `GET /storefront/qr/:token`
- Storefront bootstrap resolves branding and rules from the existing customization
  runtime and compiled catalog from the existing pricing/localization stack.
- Guest checkout and customer session flows both reuse the same cart and order model;
  PHASE 15 adds customer-profile projection, promotion apply, and repeat-order
  flow on top of the same public runtime instead of forking a separate growth channel.
- Public access is token-based and stateless: carts, customer sessions, QR entry
  links and tracking all use signed public tokens derived from the existing JWT secret.
- Storefront notifications are modeled as queued event artifacts, not as direct
  external provider delivery in the checkout transaction.
- Customer growth state stays tenant-scoped and separate from staff identities:
  `CustomerProfile` is keyed by normalized phone, loyalty uses a ledger/account
  model, and segmentation/retention remain event-backed artifacts.

## Fulfillment

- Store fulfillment config is store-scoped and currently stored as settings-backed
  JSON under `fulfillment.config`.
- Customer-facing fulfillment is applied to the cart before checkout and becomes part
  of cart/order totals through `fulfillmentFee`.
- Delivery zones provide fee, ETA and SLA defaults; pickup and dine-in provide
  promised-time/table orchestration without creating detached order channels.
- Operator dispatch updates mutate the current order fulfillment snapshot and append
  `fulfillment.assignment_updated`, `fulfillment.eta_updated`, and
  `fulfillment.status_updated` events into the existing `OrderEvent` and outbox flow.
- PHASE 14 intentionally stops short of real external courier integrations; provider
  slots exist only as extension points for later phases.

## Onboarding

- Initial tenant bootstrap is exposed as `POST /onboarding/bootstrap`.
- The onboarding runtime is platform-admin only and creates the first
  `tenant -> store -> device[]` chain in one transaction-scoped flow.
- Device bootstrap secrets are returned only once at onboarding time and remain
  hashed at rest through the existing `apiKeyHash` model.
- Kiosk devices created during onboarding can immediately receive a signed
  public access token without a second API roundtrip.

## Event Strategy

- Internal integration stays event-driven inside the modular monolith.
- Domain changes write into `OutboxEvent`.
- `EventEmitter2` is used for in-process event dispatch.
- Customer storefront status hooks and queued notifications are appended to the same
  `OrderEvent` and outbox-driven event pipeline as the rest of the commerce runtime.

## Offline-Lite And Customization

- PHASE 4 introduces offline-lite for POS as cached bootstrap + pending queue replay.
- Orders are still submitted to the existing backend APIs; there is no local-first authoritative store yet.
- PHASE 7 extends POS from payment intent capture to actual allocation processing, but still without real acquiring integration or refunds.
- PHASE 6 kiosk runtime is web/PWA-first and stays online-first; it does not yet
  add kiosk-specific offline queueing.
- PHASE 9 adds a formal `customization` runtime on top of `settings` and
  `feature-flags`, with branding configs plus a simple deterministic rules executor.
- Effective customization is exposed as `POST /customization/evaluate`, while
  management APIs cover `GET|POST|PATCH /customization/branding` and
  `GET|POST|PATCH /customization/rules`.
- Kiosk bootstrap and checkout now resolve branding/rules through this
  customization layer instead of reading raw settings directly.

## Localization

- Localization runtime is exposed as:
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
- PHASE 12 keeps localization storage inside existing settings tables using
  explicit keys for preferences, country profiles, content and templates.
- Locale precedence is centralized: query locale -> customer locale -> store
  channel locale -> store default -> tenant channel locale -> tenant default
  -> country profile default -> fallback.
- Country profiles carry currency, tax metadata and compliance flags as a policy
  layer and are intentionally kept separate from pricing/checkout arithmetic in
  this phase.
- Localized templates are synchronous in PHASE 12 and serve as a foundation for
  later customer messaging, without prematurely introducing async notification flows.

## Hardening And Operations

- API now exposes:
  - `GET /health`
  - `GET /health/live`
  - `GET /health/readiness`
  - `GET /health/metrics`
  - `GET /health/observability`
- Request ids are attached via middleware and returned as `x-request-id`.
- Global exception handling returns standardized envelopes with `statusCode`,
  `timestamp`, `path`, `requestId`, `error`, and `message`.
- Structured logs are emitted as JSON lines from the API runtime.
- Current metrics are process-local and in-memory, while `GET /health/observability`
  exposes the configured boundary for optional OTLP export and alert-webhook wiring.
- PHASE 11 does not ship a full external collector yet; it fixes the runtime
  contract and status surface so multi-instance export can be enabled without
  redefining observability semantics later.
