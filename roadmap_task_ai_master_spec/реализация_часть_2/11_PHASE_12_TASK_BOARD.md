# PHASE 12 Task Board

## Phase
`PHASE 12`

## Wave
`WAVE 2 — Globalization & Localization`

## Goal
Подготовить платформу к языкам, локалям, валютам, налогам, country profiles и localized templates без форков логики по странам.

## Status
`Not Started`

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
- [ ] Определить i18n infrastructure and locale-aware domain primitives
- [ ] Определить multilingual content storage rules для catalog and branded content
- [ ] Определить currency abstraction, tax layer и country profiles

## Deliverables
- locale primitives contract
- localized content model
- currency/tax/country profile model

## Acceptance
- [ ] Locale and language contracts едины для всех каналов
- [ ] Country-aware data model не требует tenant-specific schema forks

## Notes/Risks
- риск смешать translation storage и customization rules
- риск зашить tax behavior прямо в checkout or pricing code

---

# Epic 2 — Runtime & API
## Tasks
- [ ] Определить locale resolution policy для tenant, store, channel and customer context
- [ ] Определить API contract для localized reads and writes
- [ ] Определить formatting rules для money, date, address and phone outputs

## Deliverables
- locale resolution policy
- localized API contract
- locale-aware formatting contract

## Acceptance
- [ ] Есть единый precedence order для locale resolution
- [ ] Localized API contract совместим с existing catalog and settings runtime

## Notes/Risks
- риск локального решения только для web admin
- риск потерять consistency между write model и rendered localized outputs

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [ ] Определить i18n requirements для web, mobile and device UIs
- [ ] Определить editor requirements для multilingual catalog/content management
- [ ] Определить localized templates usage points

## Deliverables
- channel i18n requirements
- multilingual editor scope
- template usage matrix

## Acceptance
- [ ] Понятен минимальный UI scope для multilingual management
- [ ] Localized templates охватывают только эту фазу и не смешиваются с PHASE 13 notifications logic

## Notes/Risks
- риск начать строить storefront copy rules раньше PHASE 13
- риск пропустить device-facing surfaces

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [ ] Определить import/export boundary для language packs
- [ ] Определить compliance flags storage на уровне country profile
- [ ] Определить async needs для localized template generation or sync

## Deliverables
- language pack handling policy
- compliance flag policy
- async localization boundary

## Acceptance
- [ ] Country-level compliance flags отделены от runtime business hacks
- [ ] Понятно, где нужен async flow, а где достаточно synchronous resolution

## Notes/Risks
- риск превратить country profiles в свалку региональных исключений
- риск преждевременного усложнения language-pack pipeline

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [ ] Зафиксировать acceptance scenarios для locale, currency, tax and country profile behavior
- [ ] Обновить tracker и phase status при первых deliverables
- [ ] Добавить ADR при изменении domain primitives or localization precedence

## Deliverables
- localization acceptance checklist
- tracker updates
- ADR if strategic localization decision appears

## Acceptance
- [ ] Документы задают глобализацию как platform capability, а не UI patch
- [ ] Реализация может стартовать без скрытых решений по locale precedence

## Notes/Risks
- риск не проверить fallback behavior and missing translation cases
- риск не связать localization decisions с future billing and enterprise phases

---

## Done
- _пусто_

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Определить locale primitives and resolution policy
- Зафиксировать localized content model
- Определить currency/tax/country profile boundaries

## Phase Exit Summary
- [ ] I18n infrastructure определена
- [ ] Localized content storage правила зафиксированы
- [ ] Currency and tax layer определены
- [ ] Country profiles и compliance flags определены
- [ ] Localized templates contract определен
- [ ] Progress tracker обновлен
