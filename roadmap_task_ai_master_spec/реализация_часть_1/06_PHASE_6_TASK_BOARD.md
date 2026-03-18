# PHASE 6 Task Board

## Phase
PHASE 6

## Goal
Реализовать kiosk self-service runtime поверх завершенных catalog/pricing, orders, POS и kitchen flows.

## Scope
- public kiosk bootstrap
- catalog browsing
- self-order cart and checkout
- kiosk payment handoff basics
- branded UI presets
- kiosk-specific rules basics
- handoff into the main order and kitchen flow

## Deliverables
- kiosk schema and migration
- public kiosk REST contracts
- NestJS `kiosk` module
- public kiosk UI route in `apps/web`
- kiosk branding/rules config support
- live e2e for kiosk bootstrap and checkout

## Tasks
- [x] Добавить Phase 6 contracts/types для kiosk bootstrap, branding, rules и payment handoff
- [x] Расширить Prisma schema и применить migration `20260318003000_phase6_kiosk_runtime`
- [x] Включить RLS policy для `KioskPaymentHandoff`
- [x] Реализовать NestJS `kiosk` module и public endpoints `GET /kiosk/bootstrap`, `POST /kiosk/checkout`
- [x] Переиспользовать existing compiled catalog и `Cart -> Checkout -> Order -> Kitchen` flow для kiosk runtime
- [x] Реализовать kiosk branding/rules resolution через `kiosk.branding` и `kiosk.rules` settings
- [x] Добавить public kiosk UI route `/kiosk/[deviceId]` в `apps/web`
- [x] Исправить device-authored cart/order creation, чтобы `createdByUserId` не нарушал FK для device scope
- [x] Добавить live e2e для public kiosk bootstrap, checkout, payment handoff и kitchen handoff
- [x] Обновить progress tracker и architecture docs

## Done
- `packages/types` и `packages/contracts` расширены Phase 6 типами/DTO для kiosk runtime
- Добавлен permission seed `kiosk.read`
- Prisma schema расширена enum `KioskPaymentHandoffStatus` и сущностью `KioskPaymentHandoff`
- Applied migration `20260318003000_phase6_kiosk_runtime` с RLS policy
- Реализован `apps/api/src/kiosk/kiosk.module.ts`
- Добавлены public endpoints:
  - `GET /kiosk/bootstrap`
  - `POST /kiosk/checkout`
- Kiosk runtime переиспользует existing compiled catalog, cart, checkout, order transition и kitchen ticket creation
- Kiosk branding и kiosk rules читаются из store settings first, затем tenant settings
- Добавлен public web route `apps/web/src/app/kiosk/[deviceId]/page.tsx`
- Добавлен live e2e `phase6-kiosk.e2e-spec.ts`
- Workspace проходит `lint`, `typecheck`, `test`, `test:e2e`, `build`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Открыть PHASE 7 Payments
- Заменить mock kiosk payment handoff на provider-backed payment abstraction
- Определить, нужен ли kiosk-specific access token поверх публичного `deviceId` route до production-hardening
