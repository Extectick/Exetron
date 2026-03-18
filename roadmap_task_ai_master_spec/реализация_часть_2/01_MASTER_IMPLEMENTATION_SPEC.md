# Master Implementation Spec
## Исполнимый master-spec для `PHASE 11 -> PHASE 20`

## 1. Контекст
Проект уже имеет завершенный baseline `PHASE 0 -> PHASE 10`.
Это означает, что foundation, platform core, catalog, orders, POS, kitchen, kiosk, payments, analytics, customization и hardening уже существуют.

Этот пакет не переосмысливает baseline заново.
Он переводит стратегическое видение в последовательную реализацию следующих фаз.

## 2. Целевое направление
Новая очередь разработки должна эволюционировать baseline в:
- global-ready commerce platform;
- online + offline unified backend;
- multi-business and multi-brand control plane;
- extensible monetizable SaaS product;
- enterprise-ready and ecosystem-ready platform.

## 3. Что ИИ обязан сохранять
- single-backend multi-tenant модель
- bounded contexts и modular monolith discipline
- shared core вместо channel-specific forks
- configurable behavior вместо tenant-specific hacks
- localization readiness по умолчанию
- auditability, observability и payment safety

## 4. Практическая трактовка post-baseline фаз
Фазы `11 -> 20` делятся на три типа роста:
- product maturity: доведение текущего продукта до production fit
- channel and commerce expansion: online, delivery, loyalty, inventory, integrations
- packaging and scale: billing, white-label, enterprise, ecosystem

## 5. Фазовая цепочка
1. `PHASE 11` stabilizes product fit и operational maturity
2. `PHASE 12` делает платформу global-ready
3. `PHASE 13` открывает полноценный customer-facing online channel
4. `PHASE 14` углубляет fulfillment layer
5. `PHASE 15` добавляет customer retention and growth mechanics
6. `PHASE 16` выводит integrations layer на production-grade уровень
7. `PHASE 17` превращает платформу в коммерчески упакованный SaaS product
8. `PHASE 18` добавляет inventory and supply depth
9. `PHASE 19` усиливает сеть, ownership и white-label модель
10. `PHASE 20` завершает enterprise and ecosystem readiness

## 6. Правило проектирования каждой фазы
Перед началом новой задачи ИИ должен явно определить:
1. какой домен затрагивается;
2. какой reusable baseline already exists;
3. какие сущности, lifecycle и events появляются;
4. какой scope у новой логики: tenant, store, channel, country или org;
5. затрагивает ли решение entitlements, localization или compliance;
6. нужен ли ADR.

## 7. Обязательные выходы по каждой фазе
Каждая фаза должна заканчиваться:
- обновленным task board;
- обновленным progress tracker;
- списком решений;
- списком рисков и техдолга;
- кратким `Phase Exit Summary`;
- при необходимости новым ADR.

## 8. Что нельзя делать
- перепрыгивать через фазы без явной причины;
- строить новые каналы как отдельные не связанные продукты;
- смешивать стратегические backlog items из разных фаз;
- считать UX-задачу завершенной без domain/API/testing части;
- менять старые ADR молча вместо добавления новых.

## 9. Минимальный expected output от ИИ в рабочих сессиях
- context check
- next step
- plan
- deliverable
- acceptance check
- status update

Это правило обязательно даже для маленьких задач внутри фазы.
