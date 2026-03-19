# PHASE 12 Task Board

## Phase
`PHASE 12`

## Wave
`WAVE 2 — Globalization & Localization`

## Goal
Подготовить платформу к языкам, локалям, валютам, налогам, country profiles и localized templates без форков логики по странам.

## Status
`Completed`

## Dependencies
- `PHASE 11` product maturity outputs
- catalog, pricing, settings, feature flags, customization

## Completed Work Reused
- catalog and pricing core
- settings and feature flags foundation
- customization runtime and branding configs
- existing web, mobile and kiosk channel shells

---

# Epic 1 — Domain & Data
## Tasks
- [x] Определить i18n infrastructure and locale-aware domain primitives
- [x] Определить multilingual content storage rules для catalog and branded content
- [x] Определить currency abstraction, tax layer и country profiles

## Deliverables
- locale primitives contract
- localized content model
- currency/tax/country profile model

## Acceptance
- [x] Locale and language contracts едины для всех каналов
- [x] Country-aware data model не требует tenant-specific schema forks

## Notes/Risks
- риск смешать translation storage и customization rules
- риск зашить tax behavior прямо в checkout or pricing code

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить locale resolution policy для tenant, store, channel and customer context
- [x] Определить API contract для localized reads and writes
- [x] Определить formatting rules для money, date, address and phone outputs

## Deliverables
- locale resolution policy
- localized API contract
- locale-aware formatting contract

## Acceptance
- [x] Есть единый precedence order для locale resolution
- [x] Localized API contract совместим с existing catalog and settings runtime

## Notes/Risks
- риск локального решения только для web admin
- риск потерять consistency между write model и rendered localized outputs

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить i18n requirements для web, mobile and device UIs
- [x] Определить editor requirements для multilingual catalog/content management
- [x] Определить localized templates usage points

## Deliverables
- channel i18n requirements
- multilingual editor scope
- template usage matrix

## Acceptance
- [x] Понятен минимальный UI scope для multilingual management
- [x] Localized templates охватывают только эту фазу и не смешиваются с PHASE 13 notifications logic

## Notes/Risks
- риск начать строить storefront copy rules раньше PHASE 13
- риск пропустить device-facing surfaces

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить import/export boundary для language packs
- [x] Определить compliance flags storage на уровне country profile
- [x] Определить async needs для localized template generation or sync

## Deliverables
- language pack handling policy
- compliance flag policy
- async localization boundary

## Acceptance
- [x] Country-level compliance flags отделены от runtime business hacks
- [x] Понятно, где нужен async flow, а где достаточно synchronous resolution

## Notes/Risks
- риск превратить country profiles в свалку региональных исключений
- риск преждевременного усложнения language-pack pipeline

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для locale, currency, tax and country profile behavior
- [x] Обновить tracker и phase status при первых deliverables
- [x] Добавить ADR при изменении domain primitives or localization precedence

## Deliverables
- localization acceptance checklist
- tracker updates
- ADR if strategic localization decision appears

## Acceptance
- [x] Документы задают глобализацию как platform capability, а не UI patch
- [x] Реализация может стартовать без скрытых решений по locale precedence

## Notes/Risks
- риск не проверить fallback behavior and missing translation cases
- риск не связать localization decisions с future billing and enterprise phases

---

## Done
- Добавлен `apps/api/src/localization/localization.module.ts` с centralized locale resolution service и precedence `query locale -> customer locale -> store channel locale -> store default -> tenant channel locale -> tenant default -> country profile -> fallback`
- Localization registry реализован поверх existing `TenantSetting`/`StoreSetting` keys без новых schema forks: preferences, country profiles, localized content и localized templates
- Добавлены API endpoints для preferences, country profiles, content, templates, localization context, language-pack export/import и template rendering
- `GET /catalog/compiled` теперь умеет locale-aware overlays для category/product/variant/modifier option names и product descriptions, а также возвращает localization metadata
- POS и kiosk bootstrap catalog reads теперь явно передают channel context (`POS`, `KIOSK`) в compiled catalog resolution
- В web admin добавлена страница `/localization` и nav entry `Localization` для JSON-first управления preferences, country profiles, content, templates, context preview и language packs
- Добавлен e2e `apps/api/test/phase12-localization.e2e-spec.ts`, проверяющий locale precedence, localized compiled catalog, language-pack roundtrip и template rendering
- Обновлены root docs, platform docs, tracker и ADR log (`ADR-033`, `ADR-034`)

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Начать `PHASE 13`
- Расширить localized templates foundation на storefront/customer messaging только через explicit `PHASE 13+` contracts
- Не тащить tax/compliance metadata в checkout math без отдельной billing/commerce фазы

## Phase Exit Summary
- [x] I18n infrastructure определена
- [x] Localized content storage правила зафиксированы
- [x] Currency and tax layer определены
- [x] Country profiles и compliance flags определены
- [x] Localized templates contract определен
- [x] Progress tracker обновлен
