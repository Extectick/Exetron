# PHASE 19 Task Board

## Phase
`PHASE 19`

## Wave
`WAVE 9 — Network / Multi-business / White-label Expansion`

## Goal
Усилить организационную и продуктовую модель через stronger brand hierarchies, advanced org structure, multi-business ownership, rollout templates, network governance, white-label branding packs и partner management basics.

## Status
`Completed`

## Dependencies
- `PHASE 17`
- tenants, brands, stores, customization, RBAC

## Completed Work Reused
- tenants, brands and stores structure
- customization and branding configs
- RBAC and permissions foundation
- existing multi-tenant control plane

---

# Epic 1 — Domain & Data
## Tasks
- [x] Определить stronger brand hierarchies, advanced org model and multi-business ownership structure
- [x] Определить rollout templates and cloning boundaries
- [x] Определить network governance, white-label branding packs and partner management basics

## Deliverables
- brand hierarchy, org and ownership model
- rollout template model
- governance/white-label/partner basics model

## Acceptance
- [x] Org hierarchy не ломает current tenant/store ownership rules
- [x] White-label packs отделены от ad hoc custom branding

## Notes/Risks
- риск не различить tenant, business, brand and network scopes
- риск превратить white-label model в набор manual overrides

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить org traversal and access runtime
- [x] Определить rollout template application runtime
- [x] Определить governance policy enforcement contracts

## Deliverables
- org access runtime contract
- rollout template runtime contract
- governance enforcement contract

## Acceptance
- [x] Access rules совместимы с existing RBAC and tenant isolation
- [x] Template application path не требует direct data cloning hacks

## Notes/Risks
- риск зашить org-specific logic в unrelated modules
- риск не определить override precedence between templates and local configs

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить control-plane surfaces для network and org management
- [x] Определить white-label branding management touchpoints
- [x] Определить partner management visibility requirements

## Deliverables
- org management UI scope
- white-label touchpoint map
- partner visibility requirements

## Acceptance
- [x] Понятны surfaces для network-level operators
- [x] White-label management UX опирается на defined data contracts

## Notes/Risks
- риск смешать white-label admin UX with end-customer storefront concerns
- риск пропустить governance workflows for multi-business ownership

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async propagation needs for rollout templates
- [x] Определить security boundaries for org-level delegation and partner access
- [x] Определить extension points for future marketplace relationships without implementing registry here

## Deliverables
- template propagation async boundary
- org/partner security policy
- ecosystem extension points for later phase

## Acceptance
- [x] Propagation rules не ломают tenancy boundaries
- [x] Partner access basics не заходят в PHASE 20 registry scope

## Notes/Risks
- риск смешать partner basics with full ecosystem registry
- риск недооценить delegated admin and impersonation cases

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для org model, multi-business ownership, rollout templates, governance, white-label packs and partner basics
- [x] Обновить tracker после первых network deliverables
- [x] Добавить ADR при изменении ownership hierarchy or template precedence architecture

## Deliverables
- network/white-label acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 19 покрыты ровно здесь
- [x] Документы позволяют реализовывать network expansion без нарушения current tenancy model

## Notes/Risks
- риск не описать migration path from current tenant model to richer org model
- риск потерять границы between governance and monetization decisions

---

## Done
- organizations foundation теперь использует persistent org storage: `Organization`, memberships, tenant links, governance policies, rollout templates, template applications, white-label packs и partner accounts сохраняются в dedicated tables поверх existing tenant isolation
- rollout templates и governance policies реализованы как explicit artifacts/applications, а не live cross-tenant inheritance
- forward-only Prisma migration `20260319203427_phase16_20_storage_consolidation` фиксирует phase19 storage baseline; tenant-linked org artifacts теперь покрыты migration history и RLS
- post-migration cleanup: organizations runtime больше не materializes tables on startup; остался только test/reset hook
- добавлена thin admin page `/organizations`, permissions `organizations.read/write` и e2e `phase19-organizations`
- `organizations` разрезан на controller/service/helpers/mappers/state slices, чтобы следующую волну operator CRUD breadth можно было безопасно делать параллельно
- введены shared operator list/query conventions для list/detail/filter flows; `organizations` list path уже использует их как runtime baseline
- operator CRUD breadth закрыт на modular slice: `Organization`, memberships, tenant links, governance policies, rollout templates/applications, white-label packs и partner accounts поддерживают detail/update/archive/status/history flows без возврата к runtime bootstrap
- `/organizations` UI доведен от operator console до task-specific org admin workspace: roster, access, governance/templates/applications, white-label и partner flows теперь собраны в отдельные purpose-built панели
- post-roadmap reporting wave: добавлен endpoint `GET /organizations/:organizationId/overview`, который отдает org snapshot по coverage, managed-status breakdown и latest artifacts; `/organizations` использует его для operational snapshot вместо только list-derived summaries
- targeted verification повторно подтверждена на локальной Docker DB: `phase19-organizations` проходит вместе с новым org overview snapshot

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- наращивать org admin UX только через deeper operator scenarios и artifacts provenance visibility; generic console rework для roadmap exit больше не требуется
- следующая уместная волна для `organizations` уже не базовые summaries, а richer provenance drill-down и approval/escalation workflows
- при доказанной нагрузке можно отдельно нормализовать artifact status semantics (`GovernancePolicy`/`RolloutTemplate`/`WhiteLabelPack`) из JSON-managed state в dedicated columns, но для текущего roadmap exit это не требуется

## Phase Exit Summary
- [x] Advanced org model определен
- [x] Stronger brand hierarchies определены
- [x] Multi-business ownership определен
- [x] Rollout templates определены
- [x] Network governance определена
- [x] White-label branding packs и partner basics определены
- [x] Progress tracker обновлен
