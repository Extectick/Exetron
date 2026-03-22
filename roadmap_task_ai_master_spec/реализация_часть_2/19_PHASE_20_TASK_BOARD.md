# PHASE 20 Task Board

## Phase
`PHASE 20`

## Wave
`WAVE 10 — Enterprise & Compliance Readiness + WAVE 11 — Platform Ecosystem & Marketplace`

## Goal
Подготовить платформу к enterprise and ecosystem scale через SSO/SAML/OIDC, advanced role policies, stronger secrets management, audit export, compliance packs, environment isolation and deployment variants, partner SDK/contracts, integration registry, connector templates, public developer docs и extension marketplace foundations.

## Status
`Completed`

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
- [x] Определить enterprise identity boundary for SSO, SAML and OIDC
- [x] Определить advanced role policies, audit export and compliance packs model
- [x] Определить stronger secrets management, environment isolation and deployment variants
- [x] Определить partner SDK/contracts, integration registry, connector templates, public developer docs and extension marketplace foundations

## Deliverables
- enterprise identity model
- role/audit/compliance model
- secrets/environment/deployment model
- SDK/registry/docs/extension marketplace foundation model

## Acceptance
- [x] Enterprise identity model не ломает existing local auth path
- [x] Compliance and deployment concepts отделены от tenant-specific hacks

## Notes/Risks
- риск смешать identity federation with org model concerns
- риск превратить ecosystem registry в список интеграций без contract discipline

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить auth federation runtime boundaries
- [x] Определить audit export runtime and compliance enforcement touchpoints
- [x] Определить runtime contracts для deployment variants, integration registry and partner SDK usage

## Deliverables
- federation runtime contract
- audit/compliance runtime contract
- deployment/registry/SDK runtime contract

## Acceptance
- [x] Federation runtime имеет четкую связь с existing auth and RBAC
- [x] Deployment variants не требуют переписывать core modules per environment

## Notes/Risks
- риск внедрить SSO как parallel auth system
- риск не определить contract stability for partner-facing SDK usage

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить enterprise admin surfaces для identity and compliance
- [x] Определить audit export and deployment control touchpoints
- [x] Определить partner-facing surfaces для SDK, connector templates, public developer docs and registry onboarding

## Deliverables
- enterprise admin UI scope
- audit/deployment touchpoint map
- partner onboarding and docs surface scope

## Acceptance
- [x] Понятен UI scope для enterprise operators and partners
- [x] Partner-facing surfaces опираются на explicit contracts, а не internal knowledge

## Notes/Risks
- риск построить слишком широкий marketplace UX без foundation contracts
- риск не учесть operational visibility for enterprise admins

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить security requirements for identity federation, advanced role policies, stronger secrets management, compliance evidence and environment isolation
- [x] Определить async boundaries для audit export generation and registry events
- [x] Определить trust and versioning rules для partner SDK foundations

## Deliverables
- enterprise security policy
- export/registry async boundary
- SDK trust and versioning policy

## Acceptance
- [x] Security policy покрывает highest-risk enterprise scenarios
- [x] Registry and SDK foundations готовы к later marketplace expansion without silent breaking changes

## Notes/Risks
- риск недооценить secrets and certificate handling
- риск не зафиксировать compatibility guarantees for partners

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для SSO/SAML/OIDC, audit export, compliance packs, deployment variants, SDK foundations and registry foundations
- [x] Обновить tracker после первых enterprise deliverables
- [x] Добавить ADR при изменении auth architecture, deployment model or partner contract policy

## Deliverables
- enterprise/ecosystem acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 20 покрыты в этой фазе
- [x] Документы задают завершение roadmap как enterprise-ready and ecosystem-ready platform path

## Notes/Risks
- риск не описать fallback behavior when external identity provider недоступен
- риск не увязать compliance packs with localization and country profile decisions

---

## Done
- enterprise foundation теперь использует persistent runtime storage и добавляет identity providers `OIDC|SAML`, federated links, advanced role policies, audit export jobs, compliance packs/evidence, secret registry entries, deployment variants, partner SDK contracts, integration registry entries и connector templates
- local auth path не заменен: federation остается отдельной enterprise surface поверх existing auth/RBAC foundation
- forward-only Prisma migration `20260319203427_phase16_20_storage_consolidation` formalizes phase20 storage baseline, а enterprise billing shadow tables добавлены в schema для parity с raw SQL runtime
- post-migration cleanup: enterprise runtime bootstrap DDL удален; enterprise module теперь зависит от migration-first storage baseline и сохраняет только reset path
- добавлена thin admin page `/enterprise`, permissions `enterprise.read/write` и расширенный e2e `phase20-enterprise`
- enterprise/ecosystem surfaces реализованы как explicit artifacts/contracts without forking core channel modules
- `enterprise` разрезан на controller/service/helpers/state slices, чтобы дальнейший CRUD/operator expansion можно было делать без постоянных конфликтов в одном файле
- shared operator list/query conventions зафиксированы как baseline для enterprise list/detail/filter surfaces
- operator CRUD breadth закрыт: billing, identity/security/compliance и deployment/ecosystem surfaces поддерживают list/detail/update/archive/status flows на persistent runtime
- secret registry read path зафиксирован как redacted model; UI `/enterprise` уже переведен с generic CRUD console на purpose-built enterprise workspace для billing, identity/security/compliance и deployment/contracts flows
- post-roadmap reporting wave: добавлен endpoint `GET /enterprise/overview?tenantId=&organizationId=`, который собирает operational snapshot по billing, federation, security, compliance и ecosystem surfaces; `/enterprise` использует его для health/status cards и latest-asset visibility
- targeted verification повторно подтверждена на локальной Docker DB: `phase20-enterprise` проходит вместе с новым enterprise operations overview
- enterprise ecosystem foundations уже получили первый concrete downstream consumer: phase18 `inventory` читает active supplier connectors из integration registry и пишет supplier connector executions в shared `ConnectorExecutionLog`, так что registry/templates больше не существуют только как operator CRUD surface без runtime reuse
- enterprise ecosystem foundations получили и developer-facing consumption layer: `GET /enterprise/integrations/registry/:id/developer-package` и `GET /enterprise/integrations/registry/:id/developer-docs` materialize version-scoped integration package/docs artifacts из registry entry, connector template и partner SDK contracts; `/enterprise` умеет preview/download-like inspection этих artifacts
- следующий external-consumer layer тоже материализован: добавлены `IntegrationPublication` и `IntegrationPublicationEvent`, endpoints `POST /enterprise/integrations/registry/:id/publish`, `GET /enterprise/integrations/publications/:id/{package|docs}`, publication status lifecycle и adoption telemetry events; публикация хранит snapshot artifacts, release attestation, digest/signature metadata и больше не зависит от live re-render registry entry во время distribution
- public delivery больше не ограничен operator workspace: `GET /enterprise/publications/:connectorKey/:version{,/package,/docs}` отдает только `PUBLIC + PUBLISHED` artifacts без JWT, public web page `/integrations/[connectorKey]/[version]` показывает package/docs/attestation snapshot, а public fetch path автоматически пишет telemetry events `PUBLIC_PACKAGE_FETCHED` / `PUBLIC_DOCS_FETCHED`
- publication governance теперь enforced, а не только задекларирован: `GET /enterprise/integrations/registry/:id/publication-readiness` materializes policy evaluation из `manifest.distribution`, `POST /enterprise/integrations/registry/:id/publish` блокирует invalid public/channel/signature states, а `GET /enterprise/integrations/publications/:id/analytics` дает aggregated adoption view поверх raw event history
- signed release key rotation тоже materialized: `GET /enterprise/integrations/publications/:id/signing-readiness` показывает current/latest key refs и `requiresRotation`, а `POST /enterprise/integrations/publications/:id/re-sign` пере-подписывает existing publication snapshot новой secret key без republish/rebuild из live registry и пишет `RE_SIGNED` event
- deprecation rollout automation больше не ручная: `GET /enterprise/integrations/publications/:id/lifecycle-readiness` вычисляет snapshot lifecycle state из publication artifact, `POST /enterprise/integrations/publications/:id/apply-lifecycle` выполняет single-item revoke when sunset is due, а `POST /enterprise/integrations/publications/lifecycle-sweep` batch-applies due revocations и пишет lifecycle events без обращения к live registry
- partner distribution workflow теперь не сводится к `PUBLIC` release: добавлены public access requests `POST /enterprise/publications/:connectorKey/:version/access-requests`, operator approval/reject/revoke через `/enterprise/integrations/distribution-requests/:id/status`, grant-token gated partner fetches для `/enterprise/publications/:connectorKey/:version{,/package,/docs}?grantToken=...` и UI `/enterprise` для review/approval distribution requests
- long-horizon distribution analytics тоже materialized: public/partner metadata fetches теперь пишут explicit telemetry events, `GET /enterprise/integrations/publications/:id/analytics` расширен до request/grant funnel и time-window metrics, а `GET /enterprise/integrations/publications/distribution-overview` дает portfolio-level summary по publications, access requests, fetches и top artifacts; `/enterprise` показывает этот distribution overview рядом с publication telemetry
- stronger distribution governance тоже materialized: `IntegrationDistributionRequest` теперь хранит `grantedConsumerKey`, `grantExpiresAt` и `revokedAt`, partner public fetch path реально отказывает expired/bound grants, а operator API получил `GET /enterprise/integrations/distribution-requests/:id/governance-readiness`, `POST /enterprise/integrations/distribution-requests/:id/apply-governance` и `POST /enterprise/integrations/distribution-requests/governance-sweep`; `/enterprise` показывает grant expiry/binding и умеет запускать governance actions
- partner onboarding automation surfaced в `/enterprise`: distribution requests получили onboarding readiness/package read model, `issue-onboarding` flow и package summary с checklist, URLs и grant binding, так что partner handoff теперь виден отдельно от generic distribution approval
- inventory activation governance surfaced in the same operator workspace: `/enterprise` now also shows inventory connector activation requests and activation readiness alongside distribution/onboarding flows, so downstream connector rollout can be reviewed before hitting the inventory runtime boundary
- install rollout UX surfaced for the new supplier connector automation block: `/enterprise` now shows install-readiness and install-runtime actions for activation requests, while `/inventory` exposes install source and installed runtime metadata on supplier connectors and activation state cards
- runtime rollout governance surfaced in UI: `/enterprise` now also shows installed runtime rollout health, drift and governance actions on activation cards, while `/inventory` exposes rollout governance status for installed connectors and activation state cards
- provider-runtime-policy compatibility layer surfaced in UI: `/enterprise` and `/inventory` now surface provider policy health, compatibility and readiness for installed supplier connector installs and activation cards
- provider-runtime-policy governance now has an explicit shared catalog and enforcement split: `GET /enterprise/inventory/provider-runtime-policies` exposes the same policy catalog used by `inventory`, activation/install/readiness surfaces now carry `providerPolicy/providerCompatibility`, and enterprise applies those rules in `STRICT` mode while inventory connector readiness keeps them operator-visible in `WARN_ONLY`
- enterprise activation artifacts now materialize tenant runtime directly: activation requests expose install-readiness and install package previews, `install-runtime` can create or update tenant-scoped supplier connectors from connector templates/publication-backed artifacts, and runtime install metadata is written back both to activation artifacts and installed connector manifests for downstream inventory visibility
- runtime rollout governance is now operator-actionable instead of read-only: `/enterprise` activation cards can refresh rollout state, reconcile drifted installed runtimes to current source artifacts, apply governance snapshots, and optionally deactivate blocked runtime installs without leaving the enterprise workspace
- activation execution policy snapshot surfaced in UI: `/enterprise` activation cards now show policy key, risk level, execution model, signed-publication/install requirements and rollout governance so operators can gate external provider execution before install-runtime actions

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- расширять enterprise/ecosystem foundations уже не через еще один CRUD pass, а через deeper external consumers поверх уже существующих public/publication artifacts: connector/provider runtimes, downstream adoption governance и stronger policy enforcement beyond direct API/page delivery
- после inventory connector reuse, publication layer, public delivery, readiness/analytics, key rotation, lifecycle automation, partner grant workflow, distribution overview analytics, time-bound grant governance, partner onboarding packages, activation governance, runtime install automation и shared provider-policy enforcement следующий приоритет для `enterprise` уже смещается с distribution control/read models на real connector/provider runtimes and external execution policy
- при необходимости later wave может отделить raw SQL-backed enterprise billing runtime на fully Prisma-native model, но текущий roadmap exit это уже не блокирует

## Phase Exit Summary
- [x] SSO, SAML and OIDC boundaries определены
- [x] Advanced role policies определены
- [x] Stronger secrets management определен
- [x] Audit export определен
- [x] Compliance packs определены
- [x] Environment isolation and deployment variants определены
- [x] Partner SDK/contracts, integration registry, connector templates, public developer docs и extension marketplace foundations определены
- [x] Progress tracker обновлен
