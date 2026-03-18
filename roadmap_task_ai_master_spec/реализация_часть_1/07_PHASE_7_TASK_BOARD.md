# PHASE 7 Task Board

## Phase
PHASE 7

## Goal
Реализовать канонический payments runtime, который объединяет POS payment intents и kiosk payment handoff в один tenant/store-scoped payment abstraction слой.

## Scope
- `payments` backend module как единая точка работы с intents, allocations, attempts и provider configs
- simulated providers `CASH_MANUAL`, `CARD_SIMULATED`, `QR_SIMULATED`
- mixed payment для POS и single-allocation kiosk checkout
- provider config precedence `store > tenant`
- order sync policy `autoConfirmOrderOnSuccess`
- reconciliation summary, audit/outbox, payment attempt logging
- thin admin pages для provider configs, intents/attempts и reconciliation
- Expo POS client update для реального allocation processing
- kiosk runtime migration с legacy `KioskPaymentHandoff` на generic payment tables без удаления старой таблицы

## Deliverables
- Prisma schema + migration `20260318110000_phase7_payments_abstraction`
- shared contracts/types для payments API
- REST API:
  - `GET|POST /payments/provider-configs`
  - `PATCH /payments/provider-configs/:id`
  - `GET /payments/intents`
  - `GET /payments/intents/:id`
  - `POST /payments/intents`
  - `POST /payments/intents/:id/allocations/:allocationId/process`
  - `POST /payments/intents/:id/cancel`
  - `GET /payments/intents/:id/attempts`
  - `GET /payments/reconciliation/summary`
- POS compatibility wrapper `POST /pos/payment-intents`
- kiosk checkout, пишущий в generic payment entities
- web pages `/payment-provider-configs`, `/payments`, `/payment-reconciliation`
- unit tests + live e2e for PHASE 7

## Tasks
- [x] Спроектировать payment state machine и provider config precedence
- [x] Расширить Prisma schema: `PaymentIntent`, `PaymentAllocation`, `PaymentAttempt`, `PaymentProviderConfig`
- [x] Добавить migration и RLS policies для payment attempts/provider configs
- [x] Реализовать `payments` module и shared payment contracts
- [x] Оставить `POST /pos/payment-intents` как compatibility wrapper на новый runtime
- [x] Перевести kiosk checkout на generic payment tables и перестать писать новые `KioskPaymentHandoff`
- [x] Обновить Expo POS client до allocation processing и mixed payment completion
- [x] Добавить thin admin UI для configs/intents/reconciliation
- [x] Добавить unit tests и live e2e regression/phase7 coverage
- [x] Обновить progress tracker, ADR, foundation docs и README

## Done
- Added canonical `payments` runtime with intent/allocation/attempt state machines
- Added tenant/store-scoped `PaymentProviderConfig` with simulated provider settings and auto-confirm policy
- POS split payment now processes allocations through `/payments/intents/.../process`
- Kiosk checkout now uses generic payment entities and store-level provider override precedence
- Added reconciliation summary API and thin admin pages
- Added PHASE 7 unit tests and live e2e scenario `phase7-payments.e2e-spec.ts`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Open PHASE 8 Analytics & Owner Cabinet
- Decide whether payment provider configs need secrets management before real acquiring integrations
- Decide whether kiosk public access should move from raw `deviceId` to signed device token/bootstrap URL
