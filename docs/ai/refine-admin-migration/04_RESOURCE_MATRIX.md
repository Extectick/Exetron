# Resource Matrix

## Standard CRUD Resources

| Resource | URL | Backend endpoint | Page type | Refine primitive | Custom behavior |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `/dashboard` | `GET /auth/me`, `GET /health`, `GET /health/readiness` | custom overview | custom page | Показывает platform summary, quick links и system status cards |
| Tenants | `/tenants` | `GET|POST|PATCH /tenants` | standard CRUD | list/create/edit | Platform-admin only create/update actions |
| Stores | `/stores` | `GET|POST|PATCH /stores` | standard CRUD | list/create/edit | Filters by tenant and status |
| Users | `/users` | `GET|POST|PATCH /users` | standard CRUD | list/create/edit | Role/store assignment editors |
| Roles | `/roles` | `GET|POST|PATCH /roles`, `GET /permissions` | standard CRUD | list/create/edit | Permission selector fed by `/permissions` |
| Devices | `/devices` | `GET|POST|PATCH /devices`, `POST /devices/:id/kiosk-access-token` | standard CRUD + action | list/create/edit | Kiosk token issue action from row/detail view |
| Brands | `/brands` | `GET|POST|PATCH /brands` | standard CRUD | list/create/edit | Tenant-scoped filters |
| Categories | `/categories` | `GET|POST|PATCH /categories` | standard CRUD | list/create/edit | Parent category selector |
| Products | `/products` | `GET|POST|PATCH /products` | standard CRUD | list/create/edit | Variant count, availability and modifier selectors |
| Product Variants | `/product-variants` | `GET /products/:id/variants`, `POST /products/:id/variants`, `PATCH /products/:id/variants/:variantId` | child resource | custom page + forms | Обязательный parent product context |
| Modifier Groups | `/modifiers` | `GET|POST|PATCH /modifier-groups` | standard CRUD | list/create/edit | Selection mode and constraints |
| Modifier Options | `/modifier-options` | `GET /modifier-groups/:id/options`, `POST /modifier-groups/:id/options`, `PATCH /modifier-groups/:id/options/:optionId` | child resource | custom page + forms | Обязательный parent modifier-group context |
| Price Lists | `/price-lists` | `GET|POST|PATCH /price-lists` | hybrid CRUD | list/create/edit | Embedded item management with explicit target selectors |
| Catalog Overrides | `/catalog-overrides` | `GET|POST|PATCH /store-catalog-overrides` | standard CRUD | list/create/edit | Store and target filters are mandatory first-class controls |
| Feature Flags | `/feature-flags` | `GET|PUT /feature-flags` | scoped CRUD | list/edit | Upsert semantics instead of classic create/update split |

## Hybrid Resource Screens

| Screen | URL | Backend endpoint | Page type | Refine primitive | Custom behavior |
| --- | --- | --- | --- | --- | --- |
| Onboarding | `/onboarding` | `POST /onboarding/bootstrap` | guided action | custom page | Creates tenant, first store and devices in one orchestrated flow |
| Settings | `/settings` | `GET|PUT /settings/tenant`, `GET /settings/stores/:id`, `PUT /settings/store` | scoped settings workspace | custom page | Split tenant/store panels, explicit scope switching |
| Payment Provider Configs | `/payment-provider-configs` | `GET|POST /payments/provider-configs`, `PATCH /payments/provider-configs/:id` | hybrid CRUD | list/create/edit | `secrets` are write-only and rendered as rotation input, never read back |
| Customization | `/customization` | `GET|POST|PATCH /customization/branding`, `GET|POST|PATCH /customization/rules`, `POST /customization/evaluate` | split workspace | custom page | Tabs for branding and rules plus optional evaluation panel |

## Operational And Intelligence Screens

| Screen | URL | Backend endpoint | Page type | Refine primitive | Custom behavior |
| --- | --- | --- | --- | --- | --- |
| Payments | `/payments` | `GET /payments/intents`, `GET /payments/intents/:id`, `GET /payments/intents/:id/attempts`, `POST /payments/intents/:id/allocations/:allocationId/process`, `POST /payments/intents/:id/cancel` | operational workspace | custom list/detail | Master-detail flow with actions and attempts timeline |
| Payment Reconciliation | `/payment-reconciliation` | `GET /payments/reconciliation/summary` | analytical workspace | custom page | Read-only summary cards and grouped breakdowns |
| Kitchen | `/kitchen` | `GET /kitchen/tickets`, `GET /kitchen/tickets/:id`, `POST /kitchen/tickets/:id/transition` | operational workspace | custom page | Ticket queue, station filters and transition actions |
| Order Board | `/order-board` | `GET /board/orders` | operational board | custom page | Readability-first board view, not CRUD |
| Owner Cabinet | `/owner-cabinet` | `GET /analytics/owner-cabinet` | analytical workspace | custom page | Supports `LIVE`, `PREFER_SNAPSHOT`, `SNAPSHOT_ONLY` |
| Analytics Snapshots | `/analytics-snapshots` | `GET /analytics/snapshots`, `POST /analytics/snapshots`, `POST /analytics/precompute` | hybrid analytics | custom page | Snapshot list plus precompute trigger form |
| Audit | `/audit` | `GET /audit` | read-only operational log | list | Dense filters and detail drawer for payload |
| Observability | `/observability` | `GET /health/observability`, `GET /health`, `GET /health/live`, `GET /health/readiness`, `GET /health/metrics` | system status screen | custom page | Friendly status framing without raw Prometheus dump as primary view |

## Auth And Public Surfaces

| Screen | URL | Backend endpoint | Page type | Refine primitive | Custom behavior |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | auth page | custom page + authProvider | Uses new design, same backend semantics |
| Kiosk | `/kiosk/[deviceId]` | `GET /kiosk/bootstrap`, `POST /kiosk/checkout` | public runtime | outside Refine scope | Must remain isolated from admin shell and admin state |

## Implementation Notes

- `Dashboard`, `Payments`, `Kitchen`, `Order Board`, `Owner Cabinet`,
  `Analytics Snapshots`, `Customization`, `Settings`, `Observability` не должны
  быть сведены к generic CRUD scaffold.
- Child resource pages `Product Variants` и `Modifier Options` обязаны иметь
  parent selector или deep-link context, чтобы пользователь не вводил id руками.
- `Payment Provider Configs` обязаны визуально различать публичные `settings` и
  write-only `secrets`.
