# PHASE 16 Task Board

## Phase
`PHASE 16`

## Wave
`WAVE 7 — Integrations & Hardware Ecosystem`

## Goal
Довести integrations layer до production-grade уровня через real payment providers, refunds/voids/settlements, fiscal adapters, printer adapters, terminal integrations, scanner/barcode flows, webhooks и hardware bridge contracts.

## Status
`Not Started`

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
- [ ] Определить provider integration entities and states for real acquiring flows
- [ ] Определить refund, void and settlement domain boundaries
- [ ] Определить fiscal, printer, terminal, scanner/barcode and hardware bridge contracts

## Deliverables
- provider integration state model
- refund/void/settlement model
- fiscal/printer/terminal/scanner/hardware contracts

## Acceptance
- [ ] Real provider model расширяет existing payments abstraction, а не дублирует ее
- [ ] Hardware-related contracts отделены от channel-specific UI logic

## Notes/Risks
- риск разнести states по provider-specific branches
- риск смешать fiscal contract и country rules, которые зависят от PHASE 12

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить webhook framework and connector contracts
- [ ] Определить runtime path для refund, void and settlement processing
- [ ] Определить adapter runtime boundaries для fiscal and printer execution

## Deliverables
- webhook framework contract
- refund/void/settlement runtime contract
- adapter runtime boundary

## Acceptance
- [ ] Webhook and connector handling имеют idempotent runtime assumptions
- [ ] Refund and settlement flows совместимы с existing payment intent/allocation model

## Notes/Risks
- риск делать provider logic синхронно без retry policy
- риск не определить clear boundary between API commands and webhook-driven updates

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить admin surfaces для provider and adapter management
- [ ] Определить operator touchpoints для printer and fiscal failure handling
- [ ] Определить visibility requirements для settlement and refund states

## Deliverables
- provider management UI scope
- operator failure-handling touchpoints
- settlement/refund visibility requirements

## Acceptance
- [ ] Понятны user-facing surfaces для integrations management
- [ ] Failure visibility связана с audit and observability patterns

## Notes/Risks
- риск сделать adapter-specific admin UI без общего contract layer
- риск пропустить operational troubleshooting needs

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить secret handling and rotation requirements для providers and adapters
- [ ] Определить async retries, dead-letter and replay expectations
- [ ] Определить security boundaries для webhook authenticity and hardware bridge trust

## Deliverables
- integrations security policy
- async retry/replay policy
- webhook/hardware trust model

## Acceptance
- [ ] Внешние integrations не полагаются на небезопасные implicit secrets patterns
- [ ] Retry/replay policy покрывает webhook and provider failure scenarios

## Notes/Risks
- риск оставить security assumptions outside docs
- риск не учесть duplicate external callbacks and eventual consistency

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для providers, refunds, settlements, fiscal, printers, webhooks and hardware bridges
- [ ] Обновить tracker после первых integrations deliverables
- [ ] Добавить ADR при изменении integration boundary or payment state architecture

## Deliverables
- integrations acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Все backlog items PHASE 16 покрыты в этой фазе и не размазаны по соседним
- [ ] Документы позволяют перейти от simulated providers к production-grade integration design

## Notes/Risks
- риск не описать observability for external failures
- риск недооценить backward compatibility with existing payment contracts

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить provider integration state model
- Зафиксировать webhook framework
- Определить refund, settlement and adapter boundaries

## Phase Exit Summary
- [ ] Real payment provider path определен
- [ ] Refund, void and settlement flows определены
- [ ] Fiscal adapter contracts определены
- [ ] Printer adapter contracts определены
- [ ] Terminal integrations и scanner/barcode flows определены
- [ ] Webhook and hardware bridge contracts определены
- [ ] Progress tracker обновлен
