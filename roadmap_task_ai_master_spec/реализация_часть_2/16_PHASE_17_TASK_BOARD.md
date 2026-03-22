# PHASE 17 Task Board

## Phase
`PHASE 17`

## Wave
`WAVE 8 — Billing, Packaging, Monetization Engine`

## Goal
Упаковать платформу как продаваемый SaaS product через plans, subscriptions, entitlements, limits, billing accounts, invoicing, trials и reseller support.

## Status
`Completed`

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
- [x] Определить plan catalog, subscriptions and billing accounts
- [x] Определить entitlements, limits and quotas model
- [x] Определить invoicing, trials and reseller support entities

## Deliverables
- plan/subscription model
- entitlement model
- invoice/trial/reseller model

## Acceptance
- [x] Billing model не дублирует customization or feature flags, а опирается на них
- [x] Entitlements and quotas имеют явный scope: tenant, store, device or module

## Notes/Risks
- риск смешать pricing of the product with pricing inside commerce domain
- риск не определить ownership between billing account and tenant/business structures

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить subscription lifecycle runtime
- [x] Определить entitlement enforcement runtime and limit checks
- [x] Определить invoice issuance and trial transition contracts

## Deliverables
- subscription runtime contract
- entitlement enforcement contract
- invoice/trial runtime contract

## Acceptance
- [x] Понятно, где и как применяются entitlements в existing platform modules
- [x] Trial and paid transitions имеют явные state changes

## Notes/Risks
- риск hardcode plan checks inside random modules
- риск не определить graceful behavior on over-limit states

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить self-serve billing surfaces
- [x] Определить admin visibility for plans, invoices and quotas
- [x] Определить reseller-facing touchpoints

## Deliverables
- self-serve billing UI scope
- admin billing visibility requirements
- reseller touchpoint scope

## Acceptance
- [x] Billing surfaces не требуют отдельного backend fork
- [x] Quota and entitlement visibility соответствует runtime enforcement design

## Notes/Risks
- риск преждевременно строить полноценный finance backoffice
- риск не связать billing UX с onboarding from PHASE 11

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async hooks для billing events and invoice generation
- [x] Определить security boundaries для billing data and reseller access
- [x] Определить extension points для future external billing providers without integrating them now

## Deliverables
- billing async event map
- billing security policy
- billing provider extension points

## Acceptance
- [x] Billing events могут быть обработаны отдельно от request-response path
- [x] Security policy покрывает owner, admin and reseller access boundaries

## Notes/Risks
- риск игнорировать auditability для commercial actions
- риск спутать partner model этой фазы с ecosystem registry из PHASE 20

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для plans, subscriptions, entitlements, quotas, invoices, trials and reseller support
- [x] Обновить tracker после первых monetization deliverables
- [x] Добавить ADR при изменении entitlement architecture or billing ownership model

## Deliverables
- monetization acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 17 покрыты ровно в этой фазе
- [x] Документы позволяют реализовать monetization engine по частям без рассыпания core

## Notes/Risks
- риск не описать downgrade, suspension and reactivation cases
- риск недооценить coupling между usage metrics and quota enforcement

---

## Done
- billing foundation переведен на dedicated billing tables из schema (`BillingPlan`, `BillingAccount`, `Subscription`, `Invoice`, `EntitlementGrant`, `QuotaCounter`, `TrialGrant`, `ResellerAccount`) с runtime bootstrap до migration consolidation
- onboarding bootstrap теперь автоматически создает starter billing account/subscription/trial для нового tenant, не требуя отдельного billing bootstrap шага после PHASE 11 onboarding
- добавлены permissions `billing.read/write`, thin admin page `/billing` и e2e `phase17-billing`
- billing actions audit-friendly: create/update paths пишут audit и domain events через existing foundation
- forward-only Prisma migration `20260319203427_phase16_20_storage_consolidation` теперь formalizes phase17 billing tables for clean databases
- post-migration cleanup: phase17 runtime bootstrap DDL удален; billing runtime теперь strictly migration-first

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- сохранить migration-first billing baseline и не возвращать settings/bootstrap fallback

## Phase Exit Summary
- [x] Subscription plans определены
- [x] Entitlements определены
- [x] Limits and quotas определены
- [x] Billing accounts and invoices определены
- [x] Trials и reseller support определены
- [x] Progress tracker обновлен
