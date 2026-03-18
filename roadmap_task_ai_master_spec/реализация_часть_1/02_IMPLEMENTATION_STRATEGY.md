# Implementation Strategy

## Цель документа
Описать, в каком порядке и как именно ИИ должен реализовывать проект.

---

# 1. Общий принцип реализации

## Реализация должна идти так:
1. Сначала foundation architecture
2. Потом domain core
3. Потом device-facing apps
4. Потом payments / analytics
5. Потом customization
6. Потом hardening

---

# 2. Единица работы для ИИ

## Правильная единица работы
Не “сделай backend”, а:
- спроектируй модуль auth;
- создай схему БД для tenants/stores/users;
- реализуй RBAC guards;
- опиши API заказов;
- реализуй offline queue contract.

---

# 3. Формат каждой итерации ИИ

Для каждой итерации ИИ должен:
1. прочитать `01_MASTER_PROJECT_SPEC.md`
2. прочитать `03_PHASE_BREAKDOWN.md`
3. прочитать `04_PROGRESS_TRACKER.md`
4. определить активный этап
5. определить незавершенные задачи
6. выбрать минимально достаточный следующий кусок работы
7. выдать:
   - анализ
   - план
   - deliverables
   - зависимости
   - критерии завершения
8. выполнить задачу
9. обновить статус

---

# 4. Порядок реализации

## Stage A — Planning
- структура репозитория
- архитектурные решения
- модули
- data model
- API boundaries

## Stage B — Backend Core
- auth
- tenants
- stores
- users
- roles
- devices
- audit

## Stage C — Business Core
- catalog
- pricing
- orders
- payments abstraction
- events

## Stage D — Operational Interfaces
- POS
- kitchen
- board
- kiosk

## Stage E — Business Intelligence
- dashboards
- reports
- snapshots
- summaries

## Stage F — Customization
- config
- feature flags
- rules

## Stage G — Production Hardening
- tests
- observability
- deployment
- performance
- security review

---

# 5. Что лучше поручать ИИ
Лучше всего ИИ делает:
- архитектурную разбивку;
- схемы БД;
- backend модули;
- API contracts;
- types/interfaces;
- migration plans;
- acceptance checklists;
- task decomposition;
- генерацию boilerplate и core logic.

---

# 6. Что нужно обязательно проверять человеком
- бизнес-приоритеты;
- UX-решения;
- интеграции с железом;
- реальные ограничения фискализации и платежей;
- security-sensitive решения;
- финальную архитектурную целостность.

---

# 7. Как не потерять качество
На каждый этап должны быть:
- цель этапа;
- scope;
- out of scope;
- deliverables;
- acceptance criteria;
- done definition;
- checklist обновления статуса.
