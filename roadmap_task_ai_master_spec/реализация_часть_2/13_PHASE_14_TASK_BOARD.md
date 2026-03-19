# PHASE 14 Task Board

## Phase
`PHASE 14`

## Wave
`WAVE 4 — Delivery & Fulfillment`

## Goal
Добавить fulfillment depth через delivery zones, delivery fees, pickup orchestration, dine-in/table logic, courier/operator workflows, ETA/SLA logic, promised time windows и fulfillment policies.

## Status
`Completed`

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
- [x] Определить delivery zones and service area model
- [x] Определить pickup orchestration and dine-in/table entities
- [x] Определить courier/operator workflow states, ETA/SLA logic, promised time windows and fulfillment policies

## Deliverables
- delivery zone model
- pickup/table model
- courier/operator, ETA/SLA, promised time windows and fulfillment policy model

## Acceptance
- [x] Delivery, pickup and dine-in modes имеют явные boundaries
- [x] Fulfillment policies не ломают existing order lifecycle consistency

## Notes/Risks
- риск смешать fulfillment concerns с PHASE 13 checkout scope
- риск превратить order statuses в слишком общий set without operational clarity

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить runtime resolution для delivery availability and fees
- [x] Определить pickup and table service orchestration contracts
- [x] Определить courier assignment and ETA update runtime

## Deliverables
- delivery runtime contract
- pickup/table orchestration contract
- courier and ETA runtime contract

## Acceptance
- [x] Понятно, как fulfillment mode выбирается и исполняется
- [x] ETA/SLA updates укладываются в existing order event model

## Notes/Risks
- риск разнести fee logic по разным каналам
- риск не определить boundary between operational and customer-facing state updates

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить operator surfaces для dispatch and courier workflows
- [x] Определить customer-visible pickup and dine-in touchpoints
- [x] Определить table flow touchpoints for in-store channel

## Deliverables
- dispatch/operator UI scope
- pickup/dine-in touchpoint map
- table flow touchpoint list

## Acceptance
- [x] Понятны основные UI surfaces для operational teams
- [x] Table flow не создает отдельный detached channel model

## Notes/Risks
- риск преждевременно строить full courier app
- риск смешать dine-in table logic с kiosk routing

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async events для ETA updates and dispatch changes
- [x] Определить security boundaries для courier or operator actions
- [x] Определить external delivery provider extension points без фактической интеграции этой фазы

## Deliverables
- fulfillment async event map
- courier/operator security policy
- delivery provider extension points

## Acceptance
- [x] Есть event-driven path для fulfillment updates
- [x] Security policy совместима с existing RBAC and device/user model

## Notes/Risks
- риск заложить интеграционные детали PHASE 16 раньше времени
- риск недооценить idempotency and retry cases

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для delivery, pickup, dine-in, courier and ETA/SLA behavior
- [x] Обновить tracker после первых fulfillment deliverables
- [x] Добавить ADR при изменении core order lifecycle or operational state model

## Deliverables
- fulfillment acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Документы покрывают все PHASE 14 backlog items ровно в этой фазе
- [x] Реализация fulfillment layer может стартовать без скрытых предположений

## Notes/Risks
- риск пропустить cancellation and exception flows
- риск не связать fulfillment policy с future inventory constraints

---

## Done
- Добавлен `fulfillment` runtime с store-scoped config, dispatch board, courier assignment, ETA updates и fulfillment status transitions
- Cart/Order model расширен fulfillment snapshot полями: `mode`, `fee`, payload, promised time, ETA и fulfillment status
- Storefront checkout теперь требует fulfillment selection и умеет считать delivery fee через cart total до оплаты
- Public tracking и operator projection показывают fulfillment state и courier metadata
- Добавлена thin operator UI `/fulfillment` и расширен public storefront UI для delivery/pickup/dine-in selection
- Добавлен e2e `phase14-fulfillment`, обновлены docs, tracker и ADR

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Перейти к `PHASE 15`
- Не смешивать текущий fulfillment/session model с будущим CRM/loyalty profile domain
- Сохранять provider extension points manual/event-backed до реальных payment/fiscal/provider integrations следующих фаз

## Phase Exit Summary
- [x] Delivery zones определены
- [x] Delivery fees определены
- [x] Pickup orchestration определена
- [x] Dine-in and table logic определены
- [x] Courier/operator workflows определены
- [x] ETA/SLA logic, promised time windows и fulfillment policies определены
- [x] Progress tracker обновлен
