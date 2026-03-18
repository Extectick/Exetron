# PHASE 14 Task Board

## Phase
`PHASE 14`

## Wave
`WAVE 4 — Delivery & Fulfillment`

## Goal
Добавить fulfillment depth через delivery zones, delivery fees, pickup orchestration, dine-in/table logic, courier/operator workflows, ETA/SLA logic, promised time windows и fulfillment policies.

## Status
`Not Started`

## Dependencies
- `PHASE 13`
- orders, kitchen, board, kiosk, analytics

## Completed Work Reused
- orders lifecycle and events
- kitchen tickets and order board
- kiosk ordering patterns
- analytics for operational insight

---

# Epic 1 — Domain & Data
## Tasks
- [ ] Определить delivery zones and service area model
- [ ] Определить pickup orchestration and dine-in/table entities
- [ ] Определить courier/operator workflow states, ETA/SLA logic, promised time windows and fulfillment policies

## Deliverables
- delivery zone model
- pickup/table model
- courier/operator, ETA/SLA, promised time windows and fulfillment policy model

## Acceptance
- [ ] Delivery, pickup and dine-in modes имеют явные boundaries
- [ ] Fulfillment policies не ломают existing order lifecycle consistency

## Notes/Risks
- риск смешать fulfillment concerns с PHASE 13 checkout scope
- риск превратить order statuses в слишком общий set without operational clarity

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить runtime resolution для delivery availability and fees
- [ ] Определить pickup and table service orchestration contracts
- [ ] Определить courier assignment and ETA update runtime

## Deliverables
- delivery runtime contract
- pickup/table orchestration contract
- courier and ETA runtime contract

## Acceptance
- [ ] Понятно, как fulfillment mode выбирается и исполняется
- [ ] ETA/SLA updates укладываются в existing order event model

## Notes/Risks
- риск разнести fee logic по разным каналам
- риск не определить boundary between operational and customer-facing state updates

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить operator surfaces для dispatch and courier workflows
- [ ] Определить customer-visible pickup and dine-in touchpoints
- [ ] Определить table flow touchpoints for in-store channel

## Deliverables
- dispatch/operator UI scope
- pickup/dine-in touchpoint map
- table flow touchpoint list

## Acceptance
- [ ] Понятны основные UI surfaces для operational teams
- [ ] Table flow не создает отдельный detached channel model

## Notes/Risks
- риск преждевременно строить full courier app
- риск смешать dine-in table logic с kiosk routing

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить async events для ETA updates and dispatch changes
- [ ] Определить security boundaries для courier or operator actions
- [ ] Определить external delivery provider extension points без фактической интеграции этой фазы

## Deliverables
- fulfillment async event map
- courier/operator security policy
- delivery provider extension points

## Acceptance
- [ ] Есть event-driven path для fulfillment updates
- [ ] Security policy совместима с existing RBAC and device/user model

## Notes/Risks
- риск заложить интеграционные детали PHASE 16 раньше времени
- риск недооценить idempotency and retry cases

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для delivery, pickup, dine-in, courier and ETA/SLA behavior
- [ ] Обновить tracker после первых fulfillment deliverables
- [ ] Добавить ADR при изменении core order lifecycle or operational state model

## Deliverables
- fulfillment acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Документы покрывают все PHASE 14 backlog items ровно в этой фазе
- [ ] Реализация fulfillment layer может стартовать без скрытых предположений

## Notes/Risks
- риск пропустить cancellation and exception flows
- риск не связать fulfillment policy с future inventory constraints

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить delivery zone model
- Зафиксировать pickup and table flows
- Определить courier/operator, ETA/SLA, promised time windows and fulfillment policy contracts

## Phase Exit Summary
- [ ] Delivery zones определены
- [ ] Delivery fees определены
- [ ] Pickup orchestration определена
- [ ] Dine-in and table logic определены
- [ ] Courier/operator workflows определены
- [ ] ETA/SLA logic, promised time windows и fulfillment policies определены
- [ ] Progress tracker обновлен
