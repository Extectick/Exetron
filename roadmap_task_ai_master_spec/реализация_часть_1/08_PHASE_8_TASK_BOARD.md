# PHASE 8 Task Board

## Phase
PHASE 8

## Goal
Реализовать owner cabinet и базовую аналитику поверх уже готовых orders/payments, с period filters, store comparison, top products и report snapshots.

## Scope
- owner-facing dashboard API на основе transactional данных `Order` + `PaymentIntent`
- revenue summary по tenant и по одной точке
- store comparison
- top products
- cancellations / pending manual refunds summary
- period filters
- persisted report snapshots
- thin Next.js owner cabinet page в admin shell

## Deliverables
- `analytics` backend module
- analytics contracts/types
- `AnalyticsSnapshot` schema + migration + RLS
- REST API:
  - `GET /analytics/owner-cabinet`
  - `GET /analytics/snapshots`
  - `POST /analytics/snapshots`
- owner cabinet page `/owner-cabinet`
- unit tests + live e2e for PHASE 8
- updated tracker/ADR/README/foundation docs

## Tasks
- [x] Зафиксировать Phase 8 scope и owner-cabinet deliverables
- [x] Добавить analytics contracts/types и permission seeds
- [x] Расширить Prisma schema таблицей `AnalyticsSnapshot`
- [x] Добавить migration и RLS policies для analytics snapshots
- [x] Реализовать `analytics` module и owner dashboard aggregation
- [x] Добавить endpoints для owner cabinet и snapshots
- [x] Добавить owner cabinet page в web admin shell
- [x] Добавить unit test aggregation util и live e2e сценарий Phase 8
- [x] Обновить docs/progress tracker/ADR/README

## Done
- Added `analytics` module with tenant/store-scoped owner cabinet aggregation
- Added `AnalyticsSnapshot` persistence with audit/outbox and RLS
- Added `/owner-cabinet` web page with period/store filters and snapshot saving
- Added `phase8-analytics.e2e-spec.ts` and analytics util unit test

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Open PHASE 9 Customization Layer
- Decide whether analytics should evolve to precomputed read models before PHASE 10 hardening
- Decide whether owner cabinet needs CSV/export/report scheduling beyond snapshots
