# PHASE 11 Task Board

## Phase
`PHASE 11`

## Wave
`WAVE 1 — Product Maturity & Production Fit`

## Goal
Довести baseline до product-ready состояния через onboarding flows, device/kiosk hardening, observability maturity, secrets discipline и analytics precompute basics.

## Status
`Completed`

## Dependencies
- `PHASE 0 -> PHASE 10` completed baseline
- auth, tenants, stores, devices, analytics, hardening

## Completed Work Reused
- auth and RBAC foundation
- tenants, brands, stores and devices model
- owner analytics and snapshots
- structured logging, request ids, readiness and metrics endpoints
- existing device bootstrap secret hashing and domain events

---

# Epic 1 — Domain & Data
## Tasks
- [x] Уточнить onboarding lifecycle для tenant, store and device activation
- [x] Определить security state model для public kiosk/device access
- [x] Определить data contract для analytics precompute artifacts

## Deliverables
- onboarding domain map
- kiosk/device hardening state model
- analytics precompute artifact contract

## Acceptance
- [x] Описаны lifecycle и states для onboarding сущностей
- [x] Security model не ломает existing tenant/store/device boundaries

## Notes/Risks
- риск смешать onboarding domain с будущими billing or org flows
- риск hardcode public access rules в device model без расширяемости
- onboarding lifecycle сейчас зафиксирован как platform-admin bootstrap: `tenant created -> first store created -> initial devices registered -> optional kiosk token issued`
- bootstrap secrets выдаются только в момент onboarding response; отдельный rotate/reissue UX еще не добавлен

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить tenant/store/device onboarding runtime steps
- [x] Спроектировать observability runtime scope для external metrics, tracing and alerts
- [x] Зафиксировать secrets handling path для provider configs

## Deliverables
- onboarding runtime plan
- observability integration plan
- secrets handling runtime contract

## Acceptance
- [x] Есть явный runtime path для onboarding без ручных hidden steps
- [x] Есть граница между existing in-process metrics и external observability stack

## Notes/Risks
- риск размыть PHASE 11 в полноценную infra-platform migration
- риск хранить secrets как обычный JSON config и закрепить плохой паттерн
- runtime path сейчас проходит через `POST /onboarding/bootstrap` и возвращает one-shot `bootstrapSecret` для каждого созданного device
- provider configs теперь принимают отдельный `secrets` payload, сохраняют его в encrypted envelope и отдают наружу только redacted metadata

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить admin surfaces для onboarding tenant/store/device
- [x] Определить operator-facing hardening touchpoints для kiosk/device bootstrap
- [x] Определить owner-facing surface для precomputed analytics visibility

## Deliverables
- onboarding UI scope
- kiosk/device hardening touchpoint list
- analytics precompute visibility requirements

## Acceptance
- [x] Для onboarding понятен минимальный UI path
- [x] Hardening touchpoints не создают отдельный kiosk-specific fork

## Notes/Risks
- риск начать строить новый UX без фиксации domain contracts
- риск смешать owner cabinet UX с PHASE 13 storefront needs
- минимальный admin path зафиксирован как platform-admin API bootstrap; dedicated admin wizard пока не требуется
- operator hardening touchpoints зафиксированы через kiosk token issuance endpoint и signed public kiosk URL path
- owner surface для precomputed analytics реализован через owner cabinet `LIVE | PREFER_SNAPSHOT | SNAPSHOT_ONLY` и кнопку `Precompute`

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async jobs boundary для analytics precompute
- [x] Определить secret rotation and access policy
- [x] Определить security checks для kiosk public token or signed access pattern

## Deliverables
- async precompute boundary
- secrets access policy
- kiosk/device security checklist

## Acceptance
- [x] Понятно, где нужны async workers и где достаточно current runtime
- [x] Определен production-safe public access pattern для kiosk/device

## Notes/Risks
- риск недооценить secret rotation and revocation
- риск отложить hardening так, что PHASE 13 будет строиться на небезопасной модели
- текущая secret policy для provider configs: write-only `secrets`, encrypted at rest, redacted in API, rotation через explicit config update без readback
- analytics precompute сейчас выполняется inline через `POST /analytics/precompute`, а future async worker boundary зафиксирован через `analytics.precompute_requested/completed`

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance criteria для onboarding, hardening, observability and secrets
- [x] Обновить progress tracker после первых deliverables
- [x] Добавить ADR при смене security or observability boundaries

## Deliverables
- phase acceptance checklist
- tracker updates
- ADR if strategic boundary changes

## Acceptance
- [x] Документы позволяют начать реализацию без неявных решений
- [x] Tracker and task board готовы к первой рабочей итерации

## Notes/Risks
- риск формально закрыть phase planning без testable acceptance
- риск потерять связь между ops docs и actual phase tasks

---

## Done
- Реализована signed public access model для kiosk runtime через `POST /devices/:id/kiosk-access-token`
- Public kiosk `bootstrap` и `checkout` теперь требуют signed kiosk access token вместо голого `deviceId`
- Web kiosk route переведен на URL формата `/kiosk/<deviceId>?token=<kioskAccessToken>`
- Добавлен e2e сценарий `phase11-kiosk-hardening.e2e-spec.ts`
- Обновлены existing kiosk e2e сценарии под новый access flow
- Реализован platform-admin onboarding bootstrap через `POST /onboarding/bootstrap`
- Onboarding bootstrap создает `tenant`, первый `store` и initial `device[]` в одном runtime path
- Onboarding response возвращает one-shot device bootstrap secrets и может сразу выдать kiosk access token для новых kiosk devices
- Добавлен e2e сценарий `phase11-onboarding.e2e-spec.ts`
- Реализован secrets boundary для `payment provider configs`: отдельный `secrets` payload, encrypted persistence и redacted API response
- Добавлен e2e сценарий `phase11-provider-secrets.e2e-spec.ts`
- Обновлен payments regression `phase7-payments.e2e-spec.ts` под signed kiosk access flow
- Реализован analytics precompute runtime через `POST /analytics/precompute` с snapshot artifact contract и owner-cabinet read modes `LIVE | PREFER_SNAPSHOT | SNAPSHOT_ONLY`
- Реализован observability boundary status endpoint `GET /health/observability` и exporter env contract для external metrics/tracing/alerts wiring
- Обновлен owner cabinet UI под precompute visibility и read mode selection
- Добавлены e2e сценарии `phase11-analytics-precompute.e2e-spec.ts` и `phase11-observability.e2e-spec.ts`
- Обновлены analytics regression `phase8-analytics.e2e-spec.ts` и docs/env files под PHASE 11 runtime changes
- Добавлен `ADR-030` для secrets boundary payment provider configs
- Добавлены `ADR-031` и `ADR-032` для analytics precompute и observability boundary
- Пройдены проверки: API `typecheck`, Web `typecheck`, e2e `phase1-live`, `phase7-payments`, `phase8-analytics`, `phase11-kiosk-hardening`, `phase11-onboarding`, `phase11-provider-secrets`, `phase11-analytics-precompute`, `phase11-observability`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Начать `PHASE 12`
- Зафиксировать i18n/l10n runtime boundary
- Зафиксировать localized content and currency/tax contract

## Phase Exit Summary
- [x] Onboarding lifecycle и runtime path зафиксированы
- [x] Kiosk/device hardening strategy определена
- [x] External observability scope определен
- [x] Secrets handling path определен
- [x] Analytics precompute basics определены
- [x] Progress tracker обновлен
