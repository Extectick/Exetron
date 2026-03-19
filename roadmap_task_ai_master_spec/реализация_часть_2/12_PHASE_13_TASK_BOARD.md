# PHASE 13 Task Board

## Phase
`PHASE 13`

## Wave
`WAVE 3 — Online Commerce Expansion`

## Goal
Открыть полноценный online commerce channel через storefront, public catalog, customer cart/checkout, guest and customer flows, QR ordering, order tracking и notifications.

## Status
`Completed`

## Dependencies
- `PHASE 11` and `PHASE 12`
- catalog, carts, orders, kiosk, payments, customization

## Completed Work Reused
- compiled catalog and pricing resolution
- carts, checkout and order lifecycle
- kiosk self-service patterns
- payments abstraction and customization runtime

---

# Epic 1 — Domain & Data
## Tasks
- [x] Определить storefront and public catalog domain boundaries
- [x] Определить customer identity and guest checkout model
- [x] Определить order tracking and customer notification entities

## Deliverables
- storefront domain map
- guest/customer model
- tracking and notification model

## Acceptance
- [x] Public online channel reuse existing commerce core without domain fork
- [x] Customer and guest modes имеют явные lifecycle and ownership rules

## Notes/Risks
- риск дублировать kiosk flow вместо customer-facing online domain
- риск смешать PHASE 13 identity model с PHASE 15 CRM scope

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить storefront bootstrap and public catalog runtime
- [x] Определить customer cart and checkout API path
- [x] Определить QR ordering and order tracking runtime contracts

## Deliverables
- storefront runtime contract
- customer checkout API contract
- QR ordering and tracking contracts

## Acceptance
- [x] Понятен runtime path от public catalog до placed order
- [x] QR ordering не создает отдельный order lifecycle

## Notes/Risks
- риск разнести checkout logic между online and kiosk implementations
- риск не определить auth boundary between guest and customer sessions

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить storefront screens and navigation
- [x] Определить guest and customer checkout UX states
- [x] Определить order tracking and notification touchpoints

## Deliverables
- storefront UI scope
- checkout UX state list
- tracking and notification touchpoint map

## Acceptance
- [x] Понятен минимальный customer-facing UI surface
- [x] Tracking and notification touchpoints связаны с defined runtime events

## Notes/Risks
- риск начать delivery UX раньше PHASE 14
- риск сделать storefront thin CRUD without product UX maturity

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async boundary для customer notifications
- [x] Определить public channel security rules
- [x] Определить webhook or event hooks for customer order status updates

## Deliverables
- notification async boundary
- public channel security checklist
- customer status event hook contract

## Acceptance
- [x] Notification delivery path не ломает existing order ownership and audit rules
- [x] Public channel security rules совместимы с prior hardening decisions

## Notes/Risks
- риск зашить notifications прямо в synchronous checkout response
- риск не учесть replay/retry semantics для customer updates

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для storefront, guest checkout, customer checkout, QR ordering, tracking and notifications
- [x] Обновить tracker после первых online commerce deliverables
- [x] Добавить ADR при изменении customer identity or public runtime boundary

## Deliverables
- online commerce acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 13 покрыты документами без смешения с PHASE 14 or PHASE 15
- [x] Реализация online channel может стартовать из task board напрямую

## Notes/Risks
- риск пропустить guest edge cases and anonymous order ownership
- риск не отделить online customer concerns от operator-facing flows

---

## Done
- Добавлен `storefront` API module с public bootstrap, customer sessions, carts, checkout, QR links и tracking
- Реализованы signed public access tokens для cart access, customer sessions, QR links и tracking
- Public online flow переиспользует existing compiled catalog, customization, orders и payments runtime на канале `DELIVERY`
- Добавлены public web surfaces `/storefront/[storeCode]` и `/order-tracking/[orderId]`
- Customer notifications и status hooks фиксируются через `OrderEvent` и outbox-backed domain events
- Добавлен e2e `phase13-storefront` и обновлены contracts/docs/ADR/tracker

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Перейти к `PHASE 14`
- Расширить online commerce domain в delivery/pickup/fulfillment directions без fork storefront core
- Не смешивать текущий public storefront scope с CRM/loyalty задачами `PHASE 15`

## Phase Exit Summary
- [x] Storefront module scope определен
- [x] Public catalog contract определен
- [x] Customer cart and checkout path определен
- [x] Guest and customer flows определены
- [x] QR ordering, tracking and notifications определены
- [x] Progress tracker обновлен
