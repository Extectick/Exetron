# PHASE 15 Task Board

## Phase
`PHASE 15`

## Wave
`WAVE 5 — Loyalty, CRM, Promotions`

## Goal
Добавить customer growth layer через customer profiles, loyalty balances, points, coupons/promocodes, segmentation, retention hooks и repeat order experience.

## Status
`Completed`

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
- [x] Определить customer profile lifecycle and ownership model
- [x] Определить loyalty balance, points and accrual/redemption rules
- [x] Определить coupons/promocodes, segmentation and retention hooks

## Deliverables
- customer profile model
- loyalty balance and points model
- coupon/promocode/segment/retention model

## Acceptance
- [x] Customer profile model не дублирует tenant user model
- [x] Loyalty and promo entities совместимы с existing orders and payments

## Notes/Risks
- риск смешать staff identity and customer identity
- риск перенести слишком много pricing engine complexity в promotions сразу

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить runtime for profile creation and enrichment
- [x] Определить loyalty accrual and redemption runtime
- [x] Определить repeat order experience and retention hook contracts

## Deliverables
- customer profile runtime contract
- loyalty runtime contract
- repeat order and retention contracts

## Acceptance
- [x] Понятно, как loyalty подключается к existing checkout without channel forks
- [x] Repeat order flow опирается на prior order snapshots

## Notes/Risks
- риск сделать loyalty synchronous hard dependency of checkout
- риск не определить precedence между promos and customizations

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить owner/operator surfaces для customer insights and offers
- [x] Определить customer-facing touchpoints для loyalty and repeat order flows
- [x] Определить promo management surface boundaries

## Deliverables
- CRM surface scope
- loyalty/repeat touchpoint map
- promo management UI scope

## Acceptance
- [x] Понятны отдельные surface needs для operators and customers
- [x] Promo management UI не требует еще не спроектированных billing or ecosystem layers

## Notes/Risks
- риск превратить phase в marketing suite вместо commerce growth layer
- риск смешать CRM reporting with PHASE 8 analytics scope

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async hooks для segmentation and retention triggers
- [x] Определить security/privacy boundaries для customer data
- [x] Определить extension points для future CRM or campaign integrations

## Deliverables
- segmentation async boundary
- customer data security policy
- CRM extension points

## Acceptance
- [x] Customer data policy совместима с tenant isolation and auditability
- [x] Retention hooks не зашиваются в конкретный channel runtime

## Notes/Risks
- риск не учесть consent/privacy implications
- риск размазать integration concerns, которые по факту относятся к PHASE 16

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для profiles, loyalty, promos, segmentation, retention and repeat orders
- [x] Обновить tracker после первых CRM deliverables
- [x] Добавить ADR при изменении identity boundary or promo policy architecture

## Deliverables
- loyalty/CRM acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 15 присутствуют только в этой фазе
- [x] Документы позволяют реализовывать growth layer поэтапно

## Notes/Risks
- риск не описать rollback behavior для failed redemption
- риск недооценить profile merge and duplicate identity cases

---

## Done
- customer identity выделен в отдельный `CustomerProfile` domain с tenant-scoped normalized phone ownership и без смешения с staff `User`
- добавлены `LoyaltyAccount` и `LoyaltyLedgerEntry` для earn/redeem/adjust flows
- добавлен `PromotionCampaign` runtime с percentage/fixed/loyalty-redeem mechanics и cart/order snapshot carry-over
- storefront получил `PATCH /storefront/carts/:id/promotion`, customer growth summary в bootstrap и `POST /storefront/customer-sessions/orders/:id/repeat`
- checkout finalize path теперь связывает order с customer profile, начисляет/списывает points и пишет `customer.*` events для segment/retention hooks
- добавлены thin admin page `/customers`, shared API contracts, migration и e2e `phase15-customers`

## In Progress
- `PHASE 16`

## Blocked
- _пусто_

## Next
- Перейти к `PHASE 16`
- Использовать уже введенные customer/promo contracts как основу для payment/fiscal/provider integrations
- Не смешивать future billing/subscription entitlements с `CustomerProfile`

## Phase Exit Summary
- [x] Customer profiles определены
- [x] Loyalty balances и points определены
- [x] Coupons and promocodes определены
- [x] Segmentation и retention hooks определены
- [x] Repeat order experience определен
- [x] Progress tracker обновлен
