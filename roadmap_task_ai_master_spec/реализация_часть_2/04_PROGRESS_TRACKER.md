# Progress Tracker Part 2
## Статус post-baseline roadmap

## Current Phase
- Current Phase: `PHASE 12`

## Current Iteration Goal
- Current Iteration Goal: `Начать PHASE 12: i18n/l10n boundary, localized content storage, currency/tax layer and country-aware contracts`

## Overall Progress
- [x] Phase 0
- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [x] Phase 5
- [x] Phase 6
- [x] Phase 7
- [x] Phase 8
- [x] Phase 9
- [x] Phase 10
- [x] Phase 11
- [ ] Phase 12
- [ ] Phase 13
- [ ] Phase 14
- [ ] Phase 15
- [ ] Phase 16
- [ ] Phase 17
- [ ] Phase 18
- [ ] Phase 19
- [ ] Phase 20

## Done
- Baseline `PHASE 0 -> PHASE 10` завершен
- Есть рабочий multi-tenant backend и channel runtimes для POS, kiosk, kitchen and owner cabinet
- Зафиксирован стратегический roadmap для post-baseline развития
- Подготовлен AI execution pack `реализация_часть_2` для фаз `11 -> 20`
- PHASE 11 начат: kiosk public access переведен с raw `deviceId` на signed kiosk access token
- Проверки для kiosk hardening deliverable пройдены: API `typecheck`, Web `typecheck`, e2e `phase11-kiosk-hardening`, `phase6-kiosk`, `phase9-customization`
- PHASE 11: добавлен platform-admin onboarding runtime `POST /onboarding/bootstrap` для создания `tenant -> first store -> initial devices`
- Onboarding bootstrap возвращает one-shot device bootstrap secrets и может сразу выдать kiosk access token для новых kiosk devices
- Проверки для onboarding deliverable пройдены: API `typecheck`, e2e `phase11-onboarding`, regression e2e `phase11-kiosk-hardening`, `phase1-live`
- PHASE 11: payment provider configs отделяют public `settings` от sensitive `secrets`, хранят секреты в encrypted envelope и возвращают только redacted metadata
- Для provider secret boundary добавлен `ADR-030`
- Проверки для provider secret deliverable пройдены: API `typecheck`, Web `typecheck`, e2e `phase11-provider-secrets`, regression e2e `phase7-payments`
- PHASE 11: owner analytics получили precompute runtime `POST /analytics/precompute`, snapshot-aware read modes и explicit artifact boundary
- Для analytics precompute добавлен `ADR-031`
- PHASE 11: observability получила exporter env contract, status endpoint `GET /health/observability` и exporter gauges в metrics
- Для observability boundary добавлен `ADR-032`
- PHASE 11 полностью завершен: regression e2e пройдены для `phase1-live`, `phase7-payments`, `phase8-analytics`, всех новых `phase11-*` сценариев

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Начать `PHASE 12`
- Зафиксировать i18n/l10n runtime boundary
- Зафиксировать localized content and currency/tax contract

## Decisions
- Реализация идет в порядке `PHASE 11 -> PHASE 20`
- Этот tracker отражает только фактический статус post-baseline очереди
- Новые стратегические cross-cutting решения для `PHASE 11 -> PHASE 20` фиксируются новыми ADR начиная с `ADR-026`
- Kiosk public runtime теперь защищен signed kiosk access token, который выдается только из authenticated device API и проверяется на `bootstrap`/`checkout`
- Tenant/store/device onboarding для текущей волны зафиксирован как platform-admin bootstrap API, а не как отдельный self-serve billing/org flow
- Provider config secrets для текущей волны отделены от public settings, записываются как write-only encrypted envelope и не читаются обратно через CRUD API
- Analytics precompute для текущей волны переиспользует `AnalyticsSnapshot` как artifact contract и остается inline-now with async-ready events
- External observability для текущей волны зафиксирована как runtime/env boundary и status surface, а не как полный collector rollout

## Tech Debt
- для kiosk access token пока нет dedicated rotation UI; выдача идет через API endpoint
- device bootstrap secret теперь возвращается в onboarding response только один раз; отдельный rotate/reissue flow еще не реализован
- payment provider secrets пока шифруются application-level ключом из текущего API secret set; managed secret manager и независимая key rotation еще не внедрены
- kiosk public runtime пока не имеет rate limiting для token-backed public traffic
- observability export пока остается boundary/status-only without full external collector rollout
- payments runtime пока симулирует providers
- analytics precompute пока выполняется inline в API процессе; отдельный queue/worker orchestration еще не выделен
- localization, billing, inventory and enterprise layers пока отсутствуют как полноценные домены

## Cross-Phase Risks
- риск смешения scope между adjacent phases, особенно `13/14/15/16`
- риск tenant-specific hacks при country, billing or enterprise work
- риск преждевременной детализации UI без domain and API contracts
- риск silent architecture drift без ADR discipline
- риск перегрузить одну фазу задачами следующей волны
- риск перепутать текущий platform-admin onboarding bootstrap с будущим self-onboarding из monetization/billing waves
- риск принять temporary encrypted envelope за финальную замену external secret management

## Completed Work Summary
- `PHASE 0`: foundation, architecture, monorepo, environment setup
- `PHASE 1`: auth, tenants, stores, users, roles, permissions, devices, audit, settings, feature flags
- `PHASE 2`: catalog, modifiers, pricing, overrides, compiled catalog
- `PHASE 3`: carts, checkout, orders, lifecycle, events
- `PHASE 4`: POS runtime, shifts, POS sessions, offline-lite queue
- `PHASE 5`: kitchen tickets, order board, realtime feed
- `PHASE 6`: kiosk runtime and branded self-service flow
- `PHASE 7`: payments abstraction and reconciliation basics
- `PHASE 8`: owner analytics and cabinet
- `PHASE 9`: customization layer, branding configs, rules executor
- `PHASE 10`: hardening, structured logs, request ids, readiness, metrics, CI/CD gates
