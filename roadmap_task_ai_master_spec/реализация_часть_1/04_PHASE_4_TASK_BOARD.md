# PHASE 4 Task Board

## Phase
PHASE 4

## Goal
Реализовать кассовый контур поверх завершенных catalog/pricing и orders core.

## Scope
- POS session basics
- POS order creation through existing `Cart -> Checkout` flow
- payment selection and split/mixed payment contract
- shift basics
- offline-lite bootstrap cache
- offline queue sync basics

## Deliverables
- POS runtime schema and migration
- POS API contracts and NestJS `pos` module
- Expo mobile POS skeleton
- offline-lite cache and local pending queue
- payment initiation flow without payment settlement engine

## Tasks
- [x] Добавить Phase 4 contracts/types для shift, session, payment intent и POS bootstrap
- [x] Расширить Prisma schema и применить migration `20260317213000_phase4_pos_runtime`
- [x] Включить RLS policies для `PosShift`, `PosSession`, `PaymentIntent`, `PaymentAllocation`
- [x] Реализовать NestJS `pos` module и REST endpoints для bootstrap/shifts/sessions/payment-intents
- [x] Переиспользовать existing compiled catalog и orders runtime для POS order flow
- [x] Реализовать offline-lite mobile storage: session cache, bootstrap cache, pending queue
- [x] Реализовать Expo POS skeleton: login, store/device binding, shift/session start, cart, split payment, queue sync
- [x] Добавить unit test для split payment validation
- [x] Добавить live e2e для POS runtime
- [x] Обновить архитектурные заметки и progress tracker

## Done
- `packages/types` и `packages/contracts` расширены Phase 4 типами/DTO
- Добавлены permission seeds `pos.read` и `pos.write`
- Prisma schema расширена сущностями `PosShift`, `PosSession`, `PaymentIntent`, `PaymentAllocation`
- Applied migration `20260317213000_phase4_pos_runtime` с RLS policies
- Реализован `apps/api/src/pos/pos.module.ts`
- Добавлены endpoints:
  - `GET /pos/bootstrap`
  - `GET /pos/shifts`
  - `POST /pos/shifts`
  - `POST /pos/shifts/:id/close`
  - `GET /pos/sessions`
  - `POST /pos/sessions`
  - `PATCH /pos/sessions/:id/heartbeat`
  - `POST /pos/sessions/:id/end`
  - `POST /pos/payment-intents`
- Реализован split payment validator и audit/outbox writes для POS событий
- Expo mobile shell теперь покрывает POS bootstrap, cart capture, order submit и offline queue replay
- Root workspace снова проходит `lint`, `typecheck`, `test`, `test:e2e`, `build`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Открыть PHASE 5 Kitchen & Order Board
- Поверх kitchen handoff contract добавить kitchen ticket persistence и realtime board updates
- Решить, нужен ли отдельный payment completion/settlement state до Phase 6
