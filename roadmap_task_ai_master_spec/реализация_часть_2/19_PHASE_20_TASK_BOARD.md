# PHASE 20 Task Board

## Phase
`PHASE 20`

## Wave
`WAVE 10 — Enterprise & Compliance Readiness + WAVE 11 — Platform Ecosystem & Marketplace`

## Goal
Подготовить платформу к enterprise and ecosystem scale через SSO/SAML/OIDC, advanced role policies, stronger secrets management, audit export, compliance packs, environment isolation and deployment variants, partner SDK/contracts, integration registry, connector templates, public developer docs и extension marketplace foundations.

## Status
`Not Started`

## Dependencies
- `PHASE 12`, `PHASE 16`, `PHASE 19`
- auth, audit, hardening, metrics, CI/CD, RBAC

## Completed Work Reused
- auth and RBAC foundation
- audit logging patterns
- hardening and observability baseline
- CI/CD and operational docs

---

# Epic 1 — Domain & Data
## Tasks
- [ ] Определить enterprise identity boundary for SSO, SAML and OIDC
- [ ] Определить advanced role policies, audit export and compliance packs model
- [ ] Определить stronger secrets management, environment isolation and deployment variants
- [ ] Определить partner SDK/contracts, integration registry, connector templates, public developer docs and extension marketplace foundations

## Deliverables
- enterprise identity model
- role/audit/compliance model
- secrets/environment/deployment model
- SDK/registry/docs/extension marketplace foundation model

## Acceptance
- [ ] Enterprise identity model не ломает existing local auth path
- [ ] Compliance and deployment concepts отделены от tenant-specific hacks

## Notes/Risks
- риск смешать identity federation with org model concerns
- риск превратить ecosystem registry в список интеграций без contract discipline

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить auth federation runtime boundaries
- [ ] Определить audit export runtime and compliance enforcement touchpoints
- [ ] Определить runtime contracts для deployment variants, integration registry and partner SDK usage

## Deliverables
- federation runtime contract
- audit/compliance runtime contract
- deployment/registry/SDK runtime contract

## Acceptance
- [ ] Federation runtime имеет четкую связь с existing auth and RBAC
- [ ] Deployment variants не требуют переписывать core modules per environment

## Notes/Risks
- риск внедрить SSO как parallel auth system
- риск не определить contract stability for partner-facing SDK usage

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить enterprise admin surfaces для identity and compliance
- [ ] Определить audit export and deployment control touchpoints
- [ ] Определить partner-facing surfaces для SDK, connector templates, public developer docs and registry onboarding

## Deliverables
- enterprise admin UI scope
- audit/deployment touchpoint map
- partner onboarding and docs surface scope

## Acceptance
- [ ] Понятен UI scope для enterprise operators and partners
- [ ] Partner-facing surfaces опираются на explicit contracts, а не internal knowledge

## Notes/Risks
- риск построить слишком широкий marketplace UX без foundation contracts
- риск не учесть operational visibility for enterprise admins

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить security requirements for identity federation, advanced role policies, stronger secrets management, compliance evidence and environment isolation
- [ ] Определить async boundaries для audit export generation and registry events
- [ ] Определить trust and versioning rules для partner SDK foundations

## Deliverables
- enterprise security policy
- export/registry async boundary
- SDK trust and versioning policy

## Acceptance
- [ ] Security policy покрывает highest-risk enterprise scenarios
- [ ] Registry and SDK foundations готовы к later marketplace expansion without silent breaking changes

## Notes/Risks
- риск недооценить secrets and certificate handling
- риск не зафиксировать compatibility guarantees for partners

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для SSO/SAML/OIDC, audit export, compliance packs, deployment variants, SDK foundations and registry foundations
- [ ] Обновить tracker после первых enterprise deliverables
- [ ] Добавить ADR при изменении auth architecture, deployment model or partner contract policy

## Deliverables
- enterprise/ecosystem acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [ ] Все backlog items PHASE 20 покрыты в этой фазе
- [ ] Документы задают завершение roadmap как enterprise-ready and ecosystem-ready platform path

## Notes/Risks
- риск не описать fallback behavior when external identity provider недоступен
- риск не увязать compliance packs with localization and country profile decisions

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить federation boundaries
- Зафиксировать audit export and compliance packs
- Определить deployment variants, SDK and registry foundations

## Phase Exit Summary
- [ ] SSO, SAML and OIDC boundaries определены
- [ ] Advanced role policies определены
- [ ] Stronger secrets management определен
- [ ] Audit export определен
- [ ] Compliance packs определены
- [ ] Environment isolation and deployment variants определены
- [ ] Partner SDK/contracts, integration registry, connector templates, public developer docs и extension marketplace foundations определены
- [ ] Progress tracker обновлен
