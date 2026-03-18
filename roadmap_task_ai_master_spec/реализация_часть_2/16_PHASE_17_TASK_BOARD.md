# PHASE 17 Task Board

## Phase
`PHASE 17`

## Wave
`WAVE 8 — Billing, Packaging, Monetization Engine`

## Goal
Упаковать платформу как продаваемый SaaS product через plans, subscriptions, entitlements, limits, billing accounts, invoicing, trials и reseller support.

## Status
`Not Started`

## Dependencies
- `PHASE 11` and `PHASE 12`
- tenant/store model, feature flags, settings, analytics

## Completed Work Reused
- tenant, brand and store structure
- feature flags and settings layer
- analytics for usage and plan insight
- existing modular domain boundaries

---

# Epic 1 — Domain & Data
## Tasks
- [ ] Определить plan catalog, subscriptions and billing accounts
- [ ] Определить entitlements, limits and quotas model
- [ ] Определить invoicing, trials and reseller support entities

## Deliverables
- plan/subscription model
- entitlement model
- invoice/trial/reseller model

## Acceptance
- [ ] Billing model не дублирует customization or feature flags, а опирается на них
- [ ] Entitlements and quotas имеют явный scope: tenant, store, device or module

## Notes/Risks
- риск смешать pricing of the product with pricing inside commerce domain
- риск не определить ownership between billing account and tenant/business structures

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить subscription lifecycle runtime
- [ ] Определить entitlement enforcement runtime and limit checks
- [ ] Определить invoice issuance and trial transition contracts

## Deliverables
- subscription runtime contract
- entitlement enforcement contract
- invoice/trial runtime contract

## Acceptance
- [ ] Понятно, где и как применяются entitlements в existing platform modules
- [ ] Trial and paid transitions имеют явные state changes

## Notes/Risks
- риск hardcode plan checks inside random modules
- риск не определить graceful behavior on over-limit states

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить self-serve billing surfaces
- [ ] Определить admin visibility for plans, invoices and quotas
- [ ] Определить reseller-facing touchpoints

## Deliverables
- self-serve billing UI scope
- admin billing visibility requirements
- reseller touchpoint scope

## Acceptance
- [ ] Billing surfaces не требуют отдельного backend fork
- [ ] Quota and entitlement visibility соответствует runtime enforcement design

## Notes/Risks
- риск преждевременно строить полноценный finance backoffice
- риск не связать billing UX с onboarding from PHASE 11

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить async hooks для billing events and invoice generation
- [ ] Определить security boundaries для billing data and reseller access
- [ ] Определить extension points для future external billing providers without integrating them now

## Deliverables
- billing async event map
- billing security policy
- billing provider extension points

## Acceptance
- [ ] Billing events могут быть обработаны отдельно от request-response path
- [ ] Security policy покрывает owner, admin and reseller access boundaries

## Notes/Risks
- риск игнорировать auditability для commercial actions
- риск спутать partner model этой фазы с ecosystem registry из PHASE 20

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для plans, subscriptions, entitlements, quotas, invoices, trials and reseller support
- [ ] Обновить tracker после первых monetization deliverables
- [ ] Добавить ADR при изменении entitlement architecture or billing ownership model

## Deliverables
- monetization acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Все backlog items PHASE 17 покрыты ровно в этой фазе
- [ ] Документы позволяют реализовать monetization engine по частям без рассыпания core

## Notes/Risks
- риск не описать downgrade, suspension and reactivation cases
- риск недооценить coupling между usage metrics and quota enforcement

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить plans/subscriptions model
- Зафиксировать entitlements and limits
- Определить billing accounts, invoicing, trials and reseller contracts

## Phase Exit Summary
- [ ] Subscription plans определены
- [ ] Entitlements определены
- [ ] Limits and quotas определены
- [ ] Billing accounts and invoices определены
- [ ] Trials и reseller support определены
- [ ] Progress tracker обновлен
