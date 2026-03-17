# PHASE 2 Task Board

## Phase
PHASE 2

## Goal
Реализовать catalog + pricing foundation: categories, products, variants, modifiers, price lists, store catalog overrides, availability windows и compiled catalog/price preview APIs.

## Scope
- categories
- products and product variants
- modifier groups and options
- price lists with bulk items
- store catalog overrides
- availability windows
- compiled catalog endpoint
- pricing preview endpoint
- thin admin workspaces for catalog/pricing modules

## Deliverables
- Prisma schema и migration для catalog/pricing сущностей
- RLS policies для новых tenant-scoped таблиц
- REST API для categories/products/modifiers/price-lists/store overrides
- compiled catalog и price preview behavior
- shared DTO/contracts для Phase 2 ресурсов
- admin pages для categories/products/variants/modifiers/options/price lists/overrides
- unit + live e2e verification для Phase 2

## Tasks
- [x] Расширить Prisma schema для categories/products/variants/modifiers/pricing
- [x] Добавить RLS policies и permission seeds для новых ресурсов
- [x] Реализовать categories module
- [x] Реализовать products + product variants module
- [x] Реализовать modifiers + modifier options module
- [x] Реализовать price lists + store catalog overrides module
- [x] Реализовать `GET /catalog/compiled`
- [x] Реализовать `POST /pricing/preview`
- [x] Добавить shared contracts/types для Phase 2
- [x] Добавить unit tests для price precedence и availability filtering
- [x] Добавить live Postgres e2e для catalog/pricing flows
- [x] Расширить admin web shell страницами catalog/pricing
- [x] Обновить README / architecture / progress docs

## Done
- Добавлены сущности `Category`, `Product`, `ProductVariant`, `ModifierGroup`, `ModifierOption`, `ProductModifierGroup`, `PriceList`, `PriceListItem`, `StoreCatalogOverride`, `AvailabilityWindow`
- Создана и применена migration `20260317121417_phase2_catalog_pricing`
- Для новых таблиц включен PostgreSQL RLS и добавлены tenant access policies
- Реализованы CRUD/list endpoints для `categories`, `products`, nested `variants`, `modifier-groups`, nested `options`, `price-lists`, `store-catalog-overrides`
- Реализован compiled catalog endpoint с фильтрацией inactive/hidden/unavailable/out-of-stock сущностей
- Реализован price preview endpoint с precedence: store override -> price list -> variant base -> product base + modifier deltas
- Добавлены shared contracts для catalog/pricing и utility-тесты для pricing/availability logic
- Live Postgres e2e проходят для Phase 1 и Phase 2 acceptance flows
- Admin shell расширен страницами: categories, products, variants, modifier groups, modifier options, price lists, catalog overrides

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Открыть PHASE 3 planning board
- Определить scope cart/order workflow и POS-facing runtime flows
- Решить, нужен ли отдельный compiled order contract package до начала Phase 3
