# PHASE 9 Task Board

## Phase
PHASE 9

## Goal
Реализовать управляемую customization layer поверх уже существующих `settings` и `feature-flags`, без форков каналов и без дублирования runtime логики.

## Scope
- tenant settings и store settings как базовый configuration layer
- branding configs с formal data model
- feature flags как tenant/store toggles
- simple rules engine с deterministic executor
- channel-specific behavior
- point-specific behavior
- kiosk integration через новый customization resolver

## Deliverables
- `customization` backend module
- `CustomizationBrandingConfig` schema и migration
- `CustomizationRule` schema и migration
- `POST /customization/evaluate`
- CRUD/list API для branding configs и rules
- kiosk runtime integration with effective customization resolution
- thin admin page `/customization`

## Tasks
- [x] Зафиксировать scope и deliverables этапа
- [x] Добавить branding configuration model в Prisma
- [x] Добавить rules schema и RLS policies
- [x] Реализовать rules executor и deterministic merge semantics
- [x] Реализовать backend module с branding/rules/evaluate API
- [x] Интегрировать kiosk bootstrap и kiosk checkout с customization resolver
- [x] Обновить shared contracts/types и permission seeds
- [x] Добавить thin Next.js admin workspace для customization
- [x] Добавить unit tests и live e2e сценарий
- [x] Обновить progress tracker, ADR, README и architecture docs

## Done
- Реализован `customization` module с endpoint'ами:
  - `GET|POST|PATCH /customization/branding`
  - `GET|POST|PATCH /customization/rules`
  - `POST /customization/evaluate`
- Добавлены Prisma entities `CustomizationBrandingConfig` и `CustomizationRule`
- Применена migration `20260318143000_phase9_customization_layer`
- Для новых таблиц включен PostgreSQL RLS
- Добавлены permissions `customization.read` и `customization.write`
- Kiosk runtime переведен на effective customization evaluation вместо прямого чтения raw settings
- Добавлена thin admin page `/customization`
- Добавлены tests:
  - `src/customization/customization-runtime.util.spec.ts`
  - `test/phase9-customization.e2e-spec.ts`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Открыть PHASE 10 Hardening & Production Readiness
- Перевести observability, migration safety и rollback strategy в отдельный implementation slice
- Решить, нужен ли precomputed analytics layer до production hardening
