# Information Architecture

## Top-Level Model

Новая админка строится как один grouped admin shell с сохранением существующих
пользовательских URL там, где они уже устоялись.

Базовый route group:

- `src/app/(admin)/**` для всех admin screens
- `src/app/login/page.tsx` для auth entry
- `src/app/kiosk/[deviceId]/page.tsx` для public kiosk

Фактические URL не содержат префикс `(admin)` и остаются плоскими.

## Navigation Groups

### Overview

- `/dashboard`
  Главная обзорная страница control plane.

### Platform

- `/onboarding`
  Guided bootstrap для `tenant -> first store -> initial devices`.
- `/tenants`
  Tenant lifecycle.
- `/stores`
  Store topology, timezone, status.
- `/users`
  Staff identities.
- `/roles`
  Roles, permission sets и access model.
- `/devices`
  Device inventory и kiosk token issuance.

### Catalog

- `/brands`
  Tenant brands.
- `/categories`
  Category hierarchy.
- `/products`
  Product cards.
- `/product-variants`
  Variant management в списковом виде.
- `/modifiers`
  Modifier groups.
- `/modifier-options`
  Modifier options по группам.
- `/price-lists`
  Price list management.
- `/catalog-overrides`
  Store-specific catalog overrides.

### Operations

- `/payments`
  Payment intents, statuses, actions.
- `/payment-provider-configs`
  Provider config management и secret rotation.
- `/payment-reconciliation`
  Reconciliation summary.
- `/kitchen`
  Kitchen ticket workspace.
- `/order-board`
  Board feed and readiness view.

### Intelligence

- `/owner-cabinet`
  Owner analytics dashboard.
- `/analytics-snapshots`
  Snapshot list, detail context and precompute actions.

### Control

- `/settings`
  Tenant/store settings.
- `/feature-flags`
  Tenant/store feature toggles.
- `/customization`
  Branding + rules.
- `/audit`
  Audit trail.
- `/observability`
  Health/metrics/export wiring status.

## Page Archetypes

### Standard CRUD List + Form

Используется для:

- tenants
- stores
- users
- roles
- brands
- categories
- feature flags

Экран содержит:

- header
- filters toolbar
- table
- row actions
- create/edit form через page, drawer или side panel

### Parent Resource + Child Resource

Используется для:

- products -> variants
- modifier groups -> options
- price lists -> items

Правило:

- parent resource имеет собственный list/edit flow;
- child resource не живет как случайная JSON-вложенность;
- child editing выполняется через явно выбранный parent context.

### Scoped Settings Workspace

Используется для:

- tenant settings
- store settings

Правило:

- tenant scope и store scope визуально разделены;
- пользователь не работает напрямую с endpoint-формой без указанного scope.

### Operational Workspace

Используется для:

- payments
- kitchen
- order board
- owner cabinet
- payment reconciliation
- observability

Правило:

- это не generic CRUD;
- первичен runtime state, вторичны технические DTO.

### Guided Action Page

Используется для:

- onboarding
- analytics precompute
- payment config secret rotation

Правило:

- экран строится вокруг одной операции и понятного результата;
- secondary raw data не должен затмевать основное действие.

## Primary User Flows

### Platform Admin

1. Заходит в `/dashboard`.
2. Переходит в `/onboarding` и создает tenant + first store + devices.
3. Проверяет `/devices`, при необходимости перевыпускает kiosk token.
4. Настраивает `/settings`, `/feature-flags`, `/payment-provider-configs`.
5. Проверяет `/observability` и `/audit`.

### Tenant Admin

1. Заходит в `/dashboard`.
2. Работает с `/brands`, `/categories`, `/products`, `/price-lists`.
3. Настраивает `/customization` и `/feature-flags`.
4. Следит за `/payments`, `/owner-cabinet`, `/analytics-snapshots`.

### Store Operator

1. Заходит в `/payments`, `/kitchen`, `/order-board`, `/devices`.
2. Работает внутри доступных store scope без cross-tenant navigation.

## URL Preservation

Следующие URL должны быть сохранены:

- `/dashboard`
- `/tenants`
- `/brands`
- `/categories`
- `/products`
- `/product-variants`
- `/modifiers`
- `/modifier-options`
- `/price-lists`
- `/catalog-overrides`
- `/stores`
- `/users`
- `/roles`
- `/devices`
- `/owner-cabinet`
- `/payment-provider-configs`
- `/payments`
- `/payment-reconciliation`
- `/kitchen`
- `/order-board`
- `/settings`
- `/feature-flags`
- `/customization`
- `/audit`
- `/login`

Новые admin URLs, которых еще нет, но они добавляются в migration:

- `/onboarding`
- `/analytics-snapshots`
- `/observability`

## Search and Quick Actions

Первая версия не внедряет полноценный global search backend.

В header должен быть зарезервирован UI placeholder для:

- future command palette;
- future quick create actions;
- future direct navigation.

Этот placeholder не должен ломать layout и должен выглядеть как intentional
часть shell, а не как заглушка.

## Kiosk Separation

- `kiosk/[deviceId]` остается вне admin IA.
- Kiosk route не использует admin layout.
- Kiosk route не использует admin navigation.
- Kiosk route не зависит от Refine provider tree.
