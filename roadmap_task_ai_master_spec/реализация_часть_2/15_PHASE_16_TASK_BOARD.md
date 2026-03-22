# PHASE 16 Task Board

## Phase
`PHASE 16`

## Wave
`WAVE 7 — Integrations & Hardware Ecosystem`

## Goal
Довести integrations layer до production-grade уровня через real payment providers, refunds/voids/settlements, fiscal adapters, printer adapters, terminal integrations, scanner/barcode flows, webhooks и hardware bridge contracts.

## Status
`Completed`

## Dependencies
- `PHASE 11`
- payments abstraction, device model, audit, settings

## Completed Work Reused
- canonical payments runtime
- device registration model
- audit logging patterns
- settings and provider config storage

---

# Epic 1 — Domain & Data
## Tasks
- [x] Определить provider integration entities and states for real acquiring flows
- [x] Определить refund, void and settlement domain boundaries
- [x] Определить fiscal, printer, terminal, scanner/barcode and hardware bridge contracts

## Deliverables
- provider integration state model
- refund/void/settlement model
- fiscal/printer/terminal/scanner/hardware contracts

## Acceptance
- [x] Real provider model расширяет existing payments abstraction, а не дублирует ее
- [x] Hardware-related contracts отделены от channel-specific UI logic

## Notes/Risks
- риск разнести states по provider-specific branches
- риск смешать fiscal contract и country rules, которые зависят от PHASE 12

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить webhook framework and connector contracts
- [x] Определить runtime path для refund, void and settlement processing
- [x] Определить adapter runtime boundaries для fiscal and printer execution

## Deliverables
- webhook framework contract
- refund/void/settlement runtime contract
- adapter runtime boundary

## Acceptance
- [x] Webhook and connector handling имеют idempotent runtime assumptions
- [x] Refund and settlement flows совместимы с existing payment intent/allocation model

## Notes/Risks
- риск делать provider logic синхронно без retry policy
- риск не определить clear boundary between API commands and webhook-driven updates

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить admin surfaces для provider and adapter management
- [x] Определить operator touchpoints для printer and fiscal failure handling
- [x] Определить visibility requirements для settlement and refund states

## Deliverables
- provider management UI scope
- operator failure-handling touchpoints
- settlement/refund visibility requirements

## Acceptance
- [x] Понятны user-facing surfaces для integrations management
- [x] Failure visibility связана с audit and observability patterns

## Notes/Risks
- риск сделать adapter-specific admin UI без общего contract layer
- риск пропустить operational troubleshooting needs

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить secret handling and rotation requirements для providers and adapters
- [x] Определить async retries, dead-letter and replay expectations
- [x] Определить security boundaries для webhook authenticity and hardware bridge trust

## Deliverables
- integrations security policy
- async retry/replay policy
- webhook/hardware trust model

## Acceptance
- [x] Внешние integrations не полагаются на небезопасные implicit secrets patterns
- [x] Retry/replay policy покрывает webhook and provider failure scenarios

## Notes/Risks
- риск оставить security assumptions outside docs
- риск не учесть duplicate external callbacks and eventual consistency

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для providers, refunds, settlements, fiscal, printers, webhooks and hardware bridges
- [x] Обновить tracker после первых integrations deliverables
- [x] Добавить ADR при изменении integration boundary or payment state architecture

## Deliverables
- integrations acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 16 покрыты в этой фазе и не размазаны по соседним
- [x] Документы позволяют перейти от simulated providers к production-grade integration design

## Notes/Risks
- риск не описать observability for external failures
- риск недооценить backward compatibility with existing payment contracts

---

## Done
- provider-neutral adapter execution вынесен в `payment-adapter.util` и подключен в allocation processing path без слома existing payment intent/allocation semantics
- добавлены `PaymentOperation`, `PaymentSettlement`, `PaymentWebhookEvent`, `ConnectorExecutionLog`, `HardwareJob`, `HardwareReceipt` surfaces и runtime bootstrap их persistence tables
- реализованы API endpoints для operations, settlements, public webhooks, connector executions и hardware jobs/receipts
- webhook path стал idempotent по `providerKey + deliveryId` и умеет подтверждать async provider attempt/operation flows
- добавлена admin page `/integrations` для operator visibility по webhook/connector/hardware activity
- forward-only Prisma migration `20260319203427_phase16_20_storage_consolidation` регистрирует phase16 persistence surfaces и tenant-scoped RLS policies
- post-migration cleanup: phase16 runtime bootstrap DDL удален; payments module теперь работает только на migration-applied storage baseline
- добавлен e2e `phase16-integrations`; regression e2e `phase7-payments` пройден

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- сохранить migration-first deploy discipline без возврата к provider-local table bootstrap
- сохранить current provider-neutral runtime contracts без перехода на provider-specific forks

## Phase Exit Summary
- [x] Real payment provider path определен
- [x] Refund, void and settlement flows определены
- [x] Fiscal adapter contracts определены
- [x] Printer adapter contracts определены
- [x] Terminal integrations и scanner/barcode flows определены
- [x] Webhook and hardware bridge contracts определены
- [x] Progress tracker обновлен
