# Phase Breakdown

## Цель документа
Разбить реализацию на этапы так, чтобы ИИ мог работать по ним последовательно.

---

# PHASE 0 — Foundation & Architecture

## Цель
Зафиксировать архитектуру, структуру репозитория, доменную модель, стандарты разработки и базовые контракты.

## Scope
- architecture decisions
- repo structure
- module boundaries
- coding conventions
- domain map
- event map
- ERD draft
- API design principles
- environment strategy

## Deliverables
- структура монорепо/репозитория
- список backend модулей
- draft схемы БД
- список ключевых доменных событий
- стратегия multi-tenant isolation
- strategy по offline-lite
- strategy по customization

## Acceptance
- [ ] Зафиксированы backend modules
- [ ] Зафиксирована стратегия multi-tenant
- [ ] Зафиксирована стратегия кастомизации
- [ ] Зафиксирована стратегия offline-lite
- [ ] Зафиксированы правила именования и слоев

---

# PHASE 1 — Platform Core

## Цель
Реализовать основу SaaS-платформы.

## Scope
- auth
- user management
- tenant management
- brand/store management
- device registration
- audit logging
- feature flags foundation
- settings foundation

## Deliverables
- модуль auth
- модуль tenants
- модуль stores
- модуль users
- модуль roles/permissions
- модуль devices
- базовый admin API

## Acceptance
- [ ] Можно создать tenant
- [ ] Можно создать stores внутри tenant
- [ ] Можно создать пользователей
- [ ] Работает RBAC
- [ ] Работает device registration
- [ ] Audit logs сохраняются

---

# PHASE 2 — Catalog & Pricing Core

## Цель
Реализовать каталог, модификаторы, ценовую модель и store overrides.

## Scope
- categories
- products
- variants
- modifiers
- price lists
- store product overrides
- availability windows
- stock visibility basics

## Deliverables
- catalog schema
- catalog API
- price calculation core
- store-level pricing overrides

## Acceptance
- [ ] Можно создавать категории
- [ ] Можно создавать товары
- [ ] Можно задавать модификаторы
- [ ] Можно задавать разные цены по точкам
- [ ] Каталог корректно отдается в POS/kiosk контексте

---

# PHASE 3 — Orders Core

## Цель
Реализовать ядро заказов.

## Scope
- cart model
- order creation
- order items
- order statuses
- order events
- cancel/refund model basics
- channel-specific order source
- kitchen handoff contract

## Deliverables
- orders schema
- order lifecycle
- order event model
- order API
- status transition policy

## Acceptance
- [ ] Заказ создается
- [ ] Заказ проходит статусный flow
- [ ] Генерируются order events
- [ ] Заказ можно отдать в kitchen flow
- [ ] Поддерживаются разные каналы заказа

---

# PHASE 4 — POS

## Цель
Реализовать кассовый контур.

## Scope
- POS session basics
- order creation from POS
- payment selection
- split/mixed payment contract
- shift basics
- offline-lite cache
- offline queue sync basics

## Deliverables
- POS API contracts
- POS UI/app skeleton
- offline-lite strategy implementation
- payment initiation flow

## Acceptance
- [ ] Кассир может создать заказ
- [ ] Кассир может выбрать способ оплаты
- [ ] POS работает при кратковременном отсутствии сети
- [ ] После возврата сети данные синхронизируются

---

# PHASE 5 — Kitchen & Order Board

## Цель
Реализовать операционный контур кухни и табло заказов.

## Scope
- kitchen tickets
- kitchen status changes
- station routing basics
- board display
- real-time updates

## Deliverables
- kitchen module
- board module
- websocket contracts
- kitchen/board UI

## Acceptance
- [ ] Новый заказ попадает на кухню
- [ ] Кухня может менять статус
- [ ] Статус обновляется на табло в реальном времени
- [ ] Точки не видят чужие заказы

---

# PHASE 6 — Kiosk

## Цель
Реализовать киоск самообслуживания.

## Scope
- catalog browsing
- self-order flow
- kiosk cart
- payment handoff
- branded UI presets
- kiosk-specific rules basics

## Deliverables
- kiosk UI
- kiosk order flow
- kiosk branding config
- kiosk backend integration

## Acceptance
- [ ] Пользователь может собрать заказ
- [ ] Пользователь может оплатить заказ
- [ ] Заказ попадает в основной order flow
- [ ] Интерфейс поддерживает брендинг

---

# PHASE 7 — Payments

## Цель
Реализовать абстракцию оплат и множественные методы оплаты.

## Scope
- payment provider interface
- cash/card/QR model
- mixed payment model
- payment attempts
- reconciliation basics
- tenant/store payment configs

## Deliverables
- payment abstraction
- payment state machine
- provider configs
- audit/payment logging

## Acceptance
- [ ] Поддерживаются минимум 3 типа оплаты
- [ ] Поддерживается mixed payment contract
- [ ] Ошибки оплаты фиксируются
- [ ] Настройки оплат могут отличаться по точкам

---

# PHASE 8 — Analytics & Owner Cabinet

## Цель
Реализовать кабинет владельца и базовую аналитику.

## Scope
- dashboards
- revenue summary
- store comparison
- top products
- refunds/cancellations stats
- period filters
- report snapshots

## Deliverables
- analytics API
- owner cabinet dashboards
- aggregated reports
- summary widgets

## Acceptance
- [ ] Владелец видит выручку по всем точкам
- [ ] Владелец видит выручку по одной точке
- [ ] Владелец видит популярные товары
- [ ] Можно фильтровать по периоду

---

# PHASE 9 — Customization Layer

## Цель
Реализовать управляемую вариативность платформы.

## Scope
- tenant settings
- store settings
- branding configs
- feature flags
- simple rules engine
- channel-specific behavior
- point-specific behavior

## Deliverables
- settings service
- feature flags service
- rules schema
- rules executor
- branding configuration model

## Acceptance
- [ ] Можно менять настройки на уровне tenant
- [ ] Можно менять настройки на уровне store
- [ ] Можно включать/выключать фичи
- [ ] Можно задавать простые бизнес-правила

---

# PHASE 10 — Hardening & Production Readiness

## Цель
Подготовить систему к production-нагрузке и росту.

## Scope
- test coverage
- observability
- error handling
- deployment strategy
- migrations strategy
- rollback strategy
- performance review
- security review

## Deliverables
- CI/CD pipeline
- logging/metrics/tracing
- migration safety checklist
- load/perf report
- security hardening list

## Acceptance
- [ ] Есть CI/CD
- [ ] Есть structured logs
- [ ] Есть базовые метрики
- [ ] Есть тесты на critical flows
- [ ] Есть план миграций и откатов
