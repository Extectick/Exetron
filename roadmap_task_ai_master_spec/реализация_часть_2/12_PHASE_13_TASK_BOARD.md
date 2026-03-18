# PHASE 13 Task Board

## Phase
`PHASE 13`

## Wave
`WAVE 3 — Online Commerce Expansion`

## Goal
Открыть полноценный online commerce channel через storefront, public catalog, customer cart/checkout, guest and customer flows, QR ordering, order tracking и notifications.

## Status
`Not Started`

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
- [ ] Определить storefront and public catalog domain boundaries
- [ ] Определить customer identity and guest checkout model
- [ ] Определить order tracking and customer notification entities

## Deliverables
- storefront domain map
- guest/customer model
- tracking and notification model

## Acceptance
- [ ] Public online channel reuse existing commerce core without domain fork
- [ ] Customer and guest modes имеют явные lifecycle and ownership rules

## Notes/Risks
- риск дублировать kiosk flow вместо customer-facing online domain
- риск смешать PHASE 13 identity model с PHASE 15 CRM scope

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить storefront bootstrap and public catalog runtime
- [ ] Определить customer cart and checkout API path
- [ ] Определить QR ordering and order tracking runtime contracts

## Deliverables
- storefront runtime contract
- customer checkout API contract
- QR ordering and tracking contracts

## Acceptance
- [ ] Понятен runtime path от public catalog до placed order
- [ ] QR ordering не создает отдельный order lifecycle

## Notes/Risks
- риск разнести checkout logic между online and kiosk implementations
- риск не определить auth boundary between guest and customer sessions

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить storefront screens and navigation
- [ ] Определить guest and customer checkout UX states
- [ ] Определить order tracking and notification touchpoints

## Deliverables
- storefront UI scope
- checkout UX state list
- tracking and notification touchpoint map

## Acceptance
- [ ] Понятен минимальный customer-facing UI surface
- [ ] Tracking and notification touchpoints связаны с defined runtime events

## Notes/Risks
- риск начать delivery UX раньше PHASE 14
- риск сделать storefront thin CRUD without product UX maturity

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить async boundary для customer notifications
- [ ] Определить public channel security rules
- [ ] Определить webhook or event hooks for customer order status updates

## Deliverables
- notification async boundary
- public channel security checklist
- customer status event hook contract

## Acceptance
- [ ] Notification delivery path не ломает existing order ownership and audit rules
- [ ] Public channel security rules совместимы с prior hardening decisions

## Notes/Risks
- риск зашить notifications прямо в synchronous checkout response
- риск не учесть replay/retry semantics для customer updates

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для storefront, guest checkout, customer checkout, QR ordering, tracking and notifications
- [ ] Обновить tracker после первых online commerce deliverables
- [ ] Добавить ADR при изменении customer identity or public runtime boundary

## Deliverables
- online commerce acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Все backlog items PHASE 13 покрыты документами без смешения с PHASE 14 or PHASE 15
- [ ] Реализация online channel может стартовать из task board напрямую

## Notes/Risks
- риск пропустить guest edge cases and anonymous order ownership
- риск не отделить online customer concerns от operator-facing flows

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Зафиксировать storefront domain boundaries
- Определить guest/customer model
- Описать runtime path public catalog -> cart -> checkout -> tracking

## Phase Exit Summary
- [ ] Storefront module scope определен
- [ ] Public catalog contract определен
- [ ] Customer cart and checkout path определен
- [ ] Guest and customer flows определены
- [ ] QR ordering, tracking and notifications определены
- [ ] Progress tracker обновлен
