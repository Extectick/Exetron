# PHASE 5 Task Board

## Phase
PHASE 5

## Goal
Реализовать операционный контур кухни и табло заказов поверх завершенных Orders Core и POS runtime.

## Scope
- kitchen tickets
- kitchen status changes
- station routing basics
- board display
- real-time updates

## Deliverables
- kitchen schema and migration
- kitchen/board REST contracts
- websocket-based realtime contracts
- NestJS kitchen + board runtime
- thin web UI for kitchen and order board

## Tasks
- [x] Добавить Phase 5 contracts/types для kitchen tickets, board entries и realtime envelopes
- [x] Расширить Prisma schema и применить migration `20260317235500_phase5_kitchen_board`
- [x] Включить RLS policies для `KitchenTicket` и `KitchenTicketItem`
- [x] Реализовать station routing basics через `kitchen.routing` setting
- [x] Реализовать NestJS `kitchen` module и board endpoints
- [x] Реализовать websocket gateway с room-изоляцией по `tenant + store`
- [x] Интегрировать kitchen ticket creation в order confirmation flow
- [x] Добавить order status sync от kitchen runtime (`CONFIRMED -> IN_PREPARATION -> READY -> COMPLETED`)
- [x] Добавить thin web pages `/kitchen` и `/order-board`
- [x] Добавить unit tests и live e2e для kitchen/board flow
- [x] Обновить progress tracker и architecture docs

## Done
- `packages/types` и `packages/contracts` расширены Phase 5 типами/DTO
- Добавлены permission seeds `kitchen.read`, `kitchen.write`, `board.read`
- Prisma schema расширена сущностями `KitchenTicket` и `KitchenTicketItem`
- Applied migration `20260317235500_phase5_kitchen_board` с RLS policies
- Реализован `apps/api/src/kitchen/kitchen.module.ts`
- Добавлены endpoints:
  - `GET /kitchen/tickets`
  - `GET /kitchen/tickets/:id`
  - `POST /kitchen/tickets/:id/transition`
  - `GET /board/orders`
- Реализован websocket gateway с room model `tenant:{tenantId}:store:{storeId}`
- `orders` runtime теперь создает kitchen tickets на `CONFIRMED` и обновляет board feed через realtime events
- Добавлены web routes `/kitchen` и `/order-board`
- Добавлен live e2e `phase5-kitchen.e2e-spec.ts`
- Workspace проходит `lint`, `typecheck`, `test`, `test:e2e`, `build`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Открыть PHASE 6 Kiosk
- Определить kiosk-specific auth/bootstrap и self-service order UX
- Решить, нужен ли dedicated payment completion state до запуска kiosk checkout flows
