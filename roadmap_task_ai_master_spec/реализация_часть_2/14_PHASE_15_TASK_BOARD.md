# PHASE 15 Task Board

## Phase
`PHASE 15`

## Wave
`WAVE 5 — Loyalty, CRM, Promotions`

## Goal
Добавить customer growth layer через customer profiles, loyalty balances, points, coupons/promocodes, segmentation, retention hooks и repeat order experience.

## Status
`Not Started`

## Dependencies
- `PHASE 13` and `PHASE 14`
- users/roles, analytics, customization, orders, payments

## Completed Work Reused
- users and roles foundation
- analytics aggregates and snapshots
- customization rules
- orders and payments runtime

---

# Epic 1 — Domain & Data
## Tasks
- [ ] Определить customer profile lifecycle and ownership model
- [ ] Определить loyalty balance, points and accrual/redemption rules
- [ ] Определить coupons/promocodes, segmentation and retention hooks

## Deliverables
- customer profile model
- loyalty balance and points model
- coupon/promocode/segment/retention model

## Acceptance
- [ ] Customer profile model не дублирует tenant user model
- [ ] Loyalty and promo entities совместимы с existing orders and payments

## Notes/Risks
- риск смешать staff identity and customer identity
- риск перенести слишком много pricing engine complexity в promotions сразу

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить runtime for profile creation and enrichment
- [ ] Определить loyalty accrual and redemption runtime
- [ ] Определить repeat order experience and retention hook contracts

## Deliverables
- customer profile runtime contract
- loyalty runtime contract
- repeat order and retention contracts

## Acceptance
- [ ] Понятно, как loyalty подключается к existing checkout without channel forks
- [ ] Repeat order flow опирается на prior order snapshots

## Notes/Risks
- риск сделать loyalty synchronous hard dependency of checkout
- риск не определить precedence между promos and customizations

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить owner/operator surfaces для customer insights and offers
- [ ] Определить customer-facing touchpoints для loyalty and repeat order flows
- [ ] Определить promo management surface boundaries

## Deliverables
- CRM surface scope
- loyalty/repeat touchpoint map
- promo management UI scope

## Acceptance
- [ ] Понятны отдельные surface needs для operators and customers
- [ ] Promo management UI не требует еще не спроектированных billing or ecosystem layers

## Notes/Risks
- риск превратить phase в marketing suite вместо commerce growth layer
- риск смешать CRM reporting with PHASE 8 analytics scope

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить async hooks для segmentation and retention triggers
- [ ] Определить security/privacy boundaries для customer data
- [ ] Определить extension points для future CRM or campaign integrations

## Deliverables
- segmentation async boundary
- customer data security policy
- CRM extension points

## Acceptance
- [ ] Customer data policy совместима с tenant isolation and auditability
- [ ] Retention hooks не зашиваются в конкретный channel runtime

## Notes/Risks
- риск не учесть consent/privacy implications
- риск размазать integration concerns, которые по факту относятся к PHASE 16

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для profiles, loyalty, promos, segmentation, retention and repeat orders
- [ ] Обновить tracker после первых CRM deliverables
- [ ] Добавить ADR при изменении identity boundary or promo policy architecture

## Deliverables
- loyalty/CRM acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Все backlog items PHASE 15 присутствуют только в этой фазе
- [ ] Документы позволяют реализовывать growth layer поэтапно

## Notes/Risks
- риск не описать rollback behavior для failed redemption
- риск недооценить profile merge and duplicate identity cases

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить customer profile lifecycle
- Зафиксировать loyalty balance model
- Определить promo, segmentation and repeat-order contracts

## Phase Exit Summary
- [ ] Customer profiles определены
- [ ] Loyalty balances и points определены
- [ ] Coupons and promocodes определены
- [ ] Segmentation и retention hooks определены
- [ ] Repeat order experience определен
- [ ] Progress tracker обновлен
