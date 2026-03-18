# PHASE 3 Task Board

## Phase
PHASE 3

## Goal
Реализовать `Orders Core` поверх существующего catalog/pricing runtime без POS UI и без payment/kitchen persistence.

## Scope
- Cart aggregate и cart item lifecycle
- Checkout `Cart -> Order` с immutable pricing/catalog snapshot
- Order lifecycle transitions и cancel/refund basics
- Order events + outbox + kitchen handoff event contract
- REST API, Prisma migration, RLS, tests и документация

## Deliverables
- Prisma schema/migration для `Cart`, `CartItem`, `CartItemModifier`, `Order`, `OrderItem`, `OrderItemModifier`, `OrderEvent`
- NestJS `orders` module с cart CRUD/runtime и order transition service
- Shared contracts/types для orders core
- Live e2e сценарии checkout, transitions, cancel/refund, outbox
- Обновленные architecture/progress/ADR документы

## Tasks
- [x] Зафиксировать PHASE 3 scope и acceptance criteria
- [x] Расширить data model и Prisma migration для carts/orders/events
- [x] Добавить permission seed и RLS policies для новых таблиц
- [x] Реализовать backend API для carts, checkout, orders, transitions и order events
- [x] Переиспользовать Phase 2 pricing resolver для cart item pricing
- [x] Добавить unit/e2e тесты для Orders Core
- [x] Обновить architecture docs, tracker и ADR

## Done
- Открыт PHASE 3 scope как backend-first orders core
- Добавлен `orders` module в API
- Добавлены shared enums/contracts для cart/order lifecycle
- Реализованы cart create/update/item add/item patch/item delete/checkout flows
- Реализованы order list/get/transition/events endpoints
- Добавлен immutable snapshot pricing на checkout
- Добавлены `OrderEvent` записи, audit и outbox events
- Kitchen handoff оставлен event-only через `order.kitchen_handoff_requested`
- Добавлены live e2e для happy path, invalid transition и cancel with manual refund flag

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Открыть и уточнить PHASE 4 task board
- Спроектировать POS/session/device runtime поверх Orders Core
- Решить границы read models для kitchen/order board phases
