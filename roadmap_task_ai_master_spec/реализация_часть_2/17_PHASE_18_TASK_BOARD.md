# PHASE 18 Task Board

## Phase
`PHASE 18`

## Wave
`WAVE 6 — Inventory & Supply Flows`

## Goal
Добавить inventory and supply depth через stock, movements, warehouse-lite, ingredient stock, stop-list automation, receiving и stock-aware ordering.

## Status
`Not Started`

## Dependencies
- `PHASE 14` and `PHASE 15`
- catalog, orders, kitchen routing, analytics

## Completed Work Reused
- catalog and modifiers
- orders and checkout lifecycle
- kitchen routing basics
- analytics patterns for operational summaries

---

# Epic 1 — Domain & Data
## Tasks
- [ ] Определить stock and movement ledger model
- [ ] Определить warehouse-lite and supply receiving entities
- [ ] Определить ingredient stock, stop-list automation and stock-aware ordering rules

## Deliverables
- stock/movement model
- warehouse-lite/receiving model
- ingredient/stop-list/stock-aware ordering model

## Acceptance
- [ ] Stock model согласован с catalog composition and order consumption
- [ ] Receiving and movement entities отделены от general order lifecycle

## Notes/Risks
- риск смешать lightweight inventory with full ERP scope
- риск не определить relation between product stock and ingredient stock

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить stock mutation runtime and receiving flow
- [ ] Определить stop-list automation runtime
- [ ] Определить stock-aware ordering checks

## Deliverables
- stock mutation runtime contract
- stop-list automation contract
- stock-aware ordering runtime contract

## Acceptance
- [ ] Stock changes имеют явный event or transaction path
- [ ] Order acceptance policy учитывает stock constraints без channel forks

## Notes/Risks
- риск сделать stock checks только для одного канала
- риск не определить reconciliation between manual and automated stock updates

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить operator surfaces для stock visibility and receiving
- [ ] Определить kitchen-facing or store-facing touchpoints для stop-list visibility
- [ ] Определить owner-facing summaries для inventory health

## Deliverables
- inventory UI scope
- stop-list visibility touchpoints
- inventory summary visibility requirements

## Acceptance
- [ ] Понятны operational surfaces для receiving and stock corrections
- [ ] Stop-list visibility совместима с existing channel shells

## Notes/Risks
- риск смешать inventory dashboards с general analytics
- риск не охватить device-facing operational needs

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить async recalculation boundary для stop-list and availability updates
- [ ] Определить security and approval policy для manual stock adjustments
- [ ] Определить extension points для future ERP or supplier integrations without реализовывать их сейчас

## Deliverables
- inventory async boundary
- stock adjustment security policy
- ERP/supplier extension points

## Acceptance
- [ ] Async boundary покрывает propagation of stock changes
- [ ] Manual stock adjustments audit-friendly и совместимы с existing permissions model

## Notes/Risks
- риск пропустить race conditions around simultaneous stock mutations
- риск перенести supplier integration scope из будущих ecosystem tasks

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для stock, receiving, ingredient inventory, stop-list and stock-aware ordering
- [ ] Обновить tracker после первых inventory deliverables
- [ ] Добавить ADR при изменении inventory boundary or ordering policy

## Deliverables
- inventory acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Все backlog items PHASE 18 покрыты только в этой фазе
- [ ] Документы позволяют наращивать inventory depth ступенчато

## Notes/Risks
- риск не описать negative stock and recovery cases
- риск недооценить ties between inventory and promotions or fulfillment promises

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить stock and movement ledger
- Зафиксировать warehouse-lite and receiving flows
- Определить ingredient stock and stop-list automation rules

## Phase Exit Summary
- [ ] Stock and movements определены
- [ ] Warehouse-lite определен
- [ ] Ingredient stock определен
- [ ] Stop-list automation определена
- [ ] Supply receiving and stock-aware ordering определены
- [ ] Progress tracker обновлен
