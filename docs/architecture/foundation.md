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
- `AuditLog`, `OutboxEvent`
- `Category`, `Product`, `ProductVariant`
- `ModifierGroup`, `ModifierOption`, `ProductModifierGroup`
- `PriceList`, `PriceListItem`, `StoreCatalogOverride`, `AvailabilityWindow`

All tenant-scoped entities carry `tenantId`. Store-scoped entities also carry
`storeId` where appropriate.

## Isolation Strategy

- Application layer guards and tenant resolution enforce access in services.
- PostgreSQL RLS helper functions and policies are created in the baseline
  migration and extended in Phase 2 for new catalog/pricing tables.
- Request handlers run Prisma work inside `DatabaseContextService` transactions
  that set `app.current_tenant_id`, `app.current_scope`, and `app.current_user_id`.

## Catalog And Pricing

- Catalog compilation is exposed as `GET /catalog/compiled`.
- Price resolution is exposed as `POST /pricing/preview`.
- Availability windows use explicit `targetType + targetId` instead of conditional
  foreign keys, and are resolved in the application layer.
- Pricing precedence is deterministic: store override -> price list -> variant
  base -> product base, then modifier deltas are added on top.

## Event Strategy

- Internal integration stays event-driven inside the modular monolith.
- Domain changes write into `OutboxEvent`.
- `EventEmitter2` is used for in-process event dispatch.

## Offline-Lite And Customization

- Offline-lite runtime logic is deferred to POS/Kiosk phases.
- Foundation already includes `settings` and `feature-flags` services so future
  channels can consume tenant/store configuration without forks.
