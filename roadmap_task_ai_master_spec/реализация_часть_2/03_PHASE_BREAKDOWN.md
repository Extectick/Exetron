# Phase Breakdown
## Post-baseline roadmap for `PHASE 11 -> PHASE 20`

## PHASE 11 — Product Maturity & Production Fit
Цель:
довести baseline до product-ready состояния через onboarding, hardening, observability, secrets discipline и analytics precompute basics.

Scope:
- tenant/store/device onboarding
- kiosk public access hardening
- external observability stack preparation
- provider configs and secrets handling
- analytics precompute basics

Deliverables:
- onboarding flows spec and runtime tasks
- kiosk/device hardening tasks
- observability integration tasks
- secrets handling tasks
- analytics precompute tasks

Acceptance:
- [ ] Зафиксированы onboarding сценарии tenant/store/device
- [ ] Определен production-safe kiosk/device access pattern
- [ ] Определена стратегия observability outside process-local metrics
- [ ] Определен secrets handling path
- [ ] Определен scope precomputed analytics

## PHASE 12 — Globalization & Localization
Цель:
подготовить платформу к языкам, валютам, налогам и country-aware behavior.

Scope:
- i18n infrastructure
- locale-aware domain modeling
- multilingual catalog and content
- currency and tax layer
- country profiles
- localized templates and notifications

Deliverables:
- i18n model
- localized content rules
- currency/tax abstraction
- country profile contract
- localized template contract

Acceptance:
- [ ] Определены language and locale contracts
- [ ] Контент может быть локализован без форков
- [ ] Валюта и налоговая логика не зашиты в channel code
- [ ] Есть country profile model
- [ ] Шаблоны готовы к локализации

## PHASE 13 — Online Commerce
Цель:
открыть customer-facing online commerce channel поверх existing commerce core.

Scope:
- storefront
- public catalog
- cart and checkout
- guest and customer flows
- QR ordering
- order tracking
- notifications

Deliverables:
- storefront module plan
- customer checkout plan
- identity/guest policy
- tracking and notification plan

Acceptance:
- [ ] Определен public catalog and storefront scope
- [ ] Определен online checkout flow
- [ ] Определены guest and customer modes
- [ ] Определен QR ordering path
- [ ] Определен tracking and notification contract

## PHASE 14 — Delivery & Fulfillment
Цель:
углубить order execution от order acceptance до pickup, dine-in и delivery handoff.

Scope:
- delivery zones
- pickup orchestration
- dine-in and table logic
- courier workflows
- ETA and SLA logic
- fulfillment policies

Deliverables:
- delivery policy model
- pickup/table workflow model
- courier flow model
- ETA/SLA rules
- fulfillment state contract

Acceptance:
- [ ] Определены delivery zones and fees rules
- [ ] Определен pickup orchestration flow
- [ ] Определен dine-in/table flow
- [ ] Определен courier workflow
- [ ] Определены ETA/SLA policies

## PHASE 15 — Loyalty / CRM / Promotions
Цель:
добавить customer identity growth layer для retention и repeat purchase mechanics.

Scope:
- customer profiles
- loyalty balances
- coupons and promotions
- segmentation
- retention hooks
- repeat order experience

Deliverables:
- customer profile model
- loyalty and balance model
- promo and coupon model
- segmentation contract
- repeat-order flow plan

Acceptance:
- [ ] Определен customer profile lifecycle
- [ ] Определена loyalty balance model
- [ ] Определена promotions/coupons модель
- [ ] Определены segmentation hooks
- [ ] Определен repeat-order experience

## PHASE 16 — Integrations & Hardware
Цель:
перевести integrations layer из baseline abstraction в production-grade execution.

Scope:
- real payment providers
- refunds, voids and settlements
- fiscal adapters
- printer adapters
- hardware bridge contracts
- webhooks and connector contracts

Deliverables:
- provider integration contracts
- refund/void/settlement flow docs
- fiscal/printer adapter contracts
- webhook framework contract
- hardware bridge interfaces

Acceptance:
- [ ] Определен real provider integration path
- [ ] Определены refund/void/settlement flows
- [ ] Определены fiscal and printer adapter contracts
- [ ] Определен webhook framework
- [ ] Определены hardware bridge boundaries

## PHASE 17 — Billing / Plans / Monetization
Цель:
упаковать платформу в управляемый SaaS product через billing, plans и entitlements.

Scope:
- plans and subscriptions
- entitlements
- limits and quotas
- billing accounts
- invoicing
- trials
- reseller support

Deliverables:
- plan catalog model
- entitlement enforcement model
- billing account and invoice model
- trial policy
- reseller policy

Acceptance:
- [ ] Определены plans/subscriptions
- [ ] Определены entitlements and limits
- [ ] Определены billing accounts and invoices
- [ ] Определены trial rules
- [ ] Определен reseller support scope

## PHASE 18 — Inventory & Supply
Цель:
добавить stock-aware operations поверх catalog and order lifecycle.

Scope:
- stock and movements
- warehouse-lite
- ingredient stock
- stop-list automation
- supply receiving
- stock-aware ordering

Deliverables:
- stock model
- movement ledger model
- warehouse-lite flow
- receiving flow
- stop-list automation contract

Acceptance:
- [ ] Определен stock and movement model
- [ ] Определен warehouse-lite scope
- [ ] Определен ingredient inventory path
- [ ] Определен receiving flow
- [ ] Определен stock-aware ordering policy

## PHASE 19 — Network / Multi-business / White-label
Цель:
усилить ownership and brand structure для сетей, multi-business и white-label growth.

Scope:
- advanced org model
- multi-business ownership
- rollout templates
- network governance
- white-label branding packs
- partner management basics

Deliverables:
- org hierarchy model
- multi-business ownership rules
- template cloning contract
- governance policy
- white-label pack model

Acceptance:
- [ ] Определена org hierarchy
- [ ] Определен multi-business ownership scope
- [ ] Определены rollout templates
- [ ] Определены governance rules
- [ ] Определены white-label branding packs

## PHASE 20 — Enterprise / Compliance / Ecosystem
Цель:
подготовить платформу к enterprise identity, compliance и partner ecosystem.

Scope:
- SSO, SAML and OIDC
- audit export
- compliance packs
- environment and deployment variants
- partner SDK foundations
- ecosystem registry and marketplace foundations

Deliverables:
- enterprise identity contract
- audit export contract
- compliance pack contract
- deployment variant model
- partner SDK and registry foundation docs

Acceptance:
- [ ] Определены SSO/SAML/OIDC boundaries
- [ ] Определен audit export scope
- [ ] Определены compliance packs
- [ ] Определены deployment variants
- [ ] Определены partner SDK and registry foundations
