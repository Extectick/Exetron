# Master Target Vision
## Конечное видение продукта и целевое направление разработки

### Дата: 2026-03-18
### Назначение: стратегический master-document для ИИ-разработки

---

# 1. Назначение документа

Этот документ задает конечное видение продукта и служит главным ориентиром для ИИ при дальнейшей разработке.

Документ нужен для того, чтобы ИИ:
- не проектировал отдельные несвязанные функции;
- не ухудшал архитектуру ради локального ускорения;
- понимал, что уже реализованная система является baseline, а не конечной формой продукта;
- развивал платформу в сторону глобального, масштабируемого, многосегментного commerce-решения;
- писал чистый, модульный, безопасный и расширяемый код.

---

# 2. Что это за продукт в конечном варианте

Целевой продукт — это **универсальная SaaS-платформа для управления продажами товаров и услуг в офлайн и онлайн каналах**, которая объединяет в одной системе:

- управление несколькими бизнесами одного владельца;
- управление несколькими брендами и точками внутри одного клиента;
- управление кассами, киосками, кухонными экранами и табло заказов;
- онлайн-витрину, QR-заказы, доставку и pickup;
- мультиканальные платежи и фискальные сценарии;
- аналитику, роли, права и операционные процессы;
- кастомизацию под конкретного клиента, точку, канал, страну и вертикаль;
- white-label и enterprise-варианты в будущем;
- глобальную локализацию по языкам, валютам, налоговым режимам и региональным требованиям.

В конечном виде это не просто POS-система и не только платформа для еды.
Это **конструктор commerce-инфраструктуры** для малого, среднего и в перспективе крупного бизнеса, который продает:
- в зале;
- на кассе;
- через терминал самообслуживания;
- через сайт;
- через QR;
- через доставку;
- через сеть точек;
- через разные бренды внутри одного владения.

---

# 3. Продуктовая миссия

Сделать продукт, который позволяет владельцу бизнеса быстро развернуть и масштабировать продажи без заказа отдельной разработки под каждый сценарий.

Целевая миссия платформы:
- дать единый backend для многих клиентов;
- дать гибкость без форков кода;
- дать быстрый запуск новых точек и каналов;
- дать контролируемую вариативность бизнес-логики;
- дать один продукт, который одинаково применим к ресторану, сети ресторанов, кофейне, магазину, dark kitchen, retail-точке и другим форматам продаж.

---

# 4. Целевой образ продукта

## 4.1 Как должен восприниматься продукт
ИИ должен стремиться к продукту, который выглядит как:
- **операционная система продаж и обслуживания** для офлайн и онлайн бизнеса;
- **единый control plane** для owner/operator;
- **единый commerce backend** для устройств, веб-интерфейсов и интеграций;
- **платформа модулей**, а не набор несвязанных экранов.

## 4.2 Что не является целевым образом
Проект не должен скатиться в:
- “еще одну локальную кассу”;
- набор hardcoded-решений под одного клиента;
- сборник tenant-specific if/else;
- monolith-spaghetti;
- простую CRM без глубокой операционной модели;
- набор одноразовых интеграций без платформенных интерфейсов.

---

# 5. Целевые сценарии использования

## 5.1 Одиночная точка
Пример:
- один ресторан;
- одна кофейня;
- одна шаурмечная;
- одна торговая точка;
- один владелец;
- несколько сотрудников;
- 1–3 устройства.

## 5.2 Сеть точек
Пример:
- сеть ресторанов;
- сеть кофеен;
- сеть магазинов;
- центральный owner;
- store managers;
- разные точки с разной логикой, меню и настройками.

## 5.3 Один владелец, несколько разных бизнесов
Пример:
- кофейня;
- магазин;
- доставка еды;
- retail corner;
- popup точка.

Система должна позволять одному владельцу:
- видеть консолидированные данные;
- вести разные бренды;
- разделять процессы;
- разделять каталоги, оплаты, роли и аналитику.

## 5.4 Гибрид офлайн + онлайн
Платформа должна поддерживать одновременно:
- продажи через POS;
- продажи через kiosk;
- продажи через web-storefront;
- QR ordering;
- доставку;
- самовывоз;
- pre-order;
- table service.

---

# 6. Главные продуктовые столпы

## 6.1 Multi-tenant SaaS
Один backend для всех клиентов.
Изоляция клиентов должна быть строгой и системной.

## 6.2 Unified Commerce Core
Заказы, каталог, платежи, каналы продаж и устройства должны работать поверх общего commerce-ядра.

## 6.3 Configurable, not forked
Различия между клиентами реализуются через:
- config;
- feature flags;
- rules;
- extensions;
а не через форки и tenant-specific hacks.

## 6.4 Offline-capable Operations
Операционные клиенты должны переживать кратковременную потерю сети без разрушения бизнес-процесса.

## 6.5 Omnichannel
Онлайн и офлайн продажи — части одной системы, а не отдельные продукты.

## 6.6 Global-ready
Платформа должна с самого развития идти к поддержке:
- языков;
- валют;
- налогов;
- форматов адресов и телефонов;
- региональных платежей;
- локальных нормативных требований.

## 6.7 Enterprise-evolvable
Сейчас продукт SaaS-first, но архитектура не должна закрывать путь к:
- white-label;
- enterprise plans;
- выделенным окружениям;
- on-prem/hybrid в будущем.

---

# 7. Текущее состояние платформы (baseline v1)

На момент подготовки документа уже реализован baseline, закрывающий исходные 10 фаз.

## 7.1 Что уже существует
Существует рабочая основа на:
- `NestJS modular monolith`
- `Prisma`
- `PostgreSQL`
- `Redis`
- `Next.js`
- `Expo/React Native scaffold`

## 7.2 Уже реализованные крупные блоки
- platform core;
- auth;
- tenants / brands / stores;
- users / roles / permissions;
- devices;
- audit;
- catalog / pricing;
- orders;
- POS runtime;
- kitchen / order board;
- kiosk runtime;
- payments abstraction;
- owner analytics;
- customization layer;
- hardening / readiness / metrics / CI/CD.

## 7.3 Что означает этот baseline
Это означает, что фундамент уже создан.
Дальнейшая работа не должна возвращаться к проектированию базового SaaS-ядра как будто его не существует.

Следующая разработка должна быть направлена на:
- продуктовую зрелость;
- глобализацию;
- многоканальность;
- рыночную применимость;
- production-grade интеграции;
- расширение продуктовой глубины.

---

# 8. Целевой конечный продукт

В конечной форме платформа должна состоять из следующих слоев.

## 8.1 Commerce Core
Каноническое ядро:
- catalog;
- pricing;
- orders;
- carts;
- payments;
- delivery;
- refunds;
- promotions;
- fulfillment;
- inventory integration;
- customer identity.

## 8.2 Operational Apps
Клиентские интерфейсы и приложения:
- POS;
- kiosk;
- kitchen display;
- order board;
- courier/operator screen;
- owner cabinet;
- admin console;
- storefront;
- QR ordering UI;
- staff mobile workflows.

## 8.3 Business Control Layer
Управление бизнесом:
- tenants;
- brands;
- stores;
- staff;
- RBAC;
- business settings;
- policies;
- feature flags;
- business rules;
- reporting;
- operational oversight.

## 8.4 Integration Layer
Интеграции:
- payment providers;
- fiscal providers;
- printers;
- hardware bridges;
- delivery providers;
- loyalty/CRM tools;
- inventory/ERP;
- notifications;
- external channels.

## 8.5 Localization Layer
Все региональные и языковые параметры:
- translations;
- locale-aware formatting;
- currencies;
- taxes;
- regulatory modes;
- region-specific flows.

## 8.6 Platform & Reliability Layer
Поддержка качества:
- observability;
- error handling;
- metrics;
- tracing;
- security controls;
- CI/CD;
- rollout strategy;
- migration safety;
- tenancy safety;
- performance controls.

---

# 9. Продуктовые направления, которые должны появиться поверх baseline

## 9.1 Online Commerce
Нужно развить систему из “off-site operational platform” в “unified commerce platform”.

Обязательно добавить:
- online storefront;
- публичные каталоги;
- QR ordering;
- customer cart;
- customer checkout;
- customer notifications;
- pickup and delivery flows;
- customer accounts / guest flows;
- order tracking.

## 9.2 Delivery & Fulfillment
Развить:
- delivery zones;
- delivery fees;
- promised time windows;
- courier assignment model;
- pickup scheduling;
- dine-in/table service;
- kitchen-to-delivery workflow.

## 9.3 Loyalty & CRM
Добавить:
- customer profiles;
- loyalty programs;
- points;
- coupons;
- targeted offers;
- repeat-order flows;
- customer segmentation;
- campaign hooks.

## 9.4 Inventory & Stock
Добавить:
- stock visibility;
- stock movements;
- stop-list automation;
- ingredient-level inventory for food flows;
- simple warehouse / advanced warehouse tiers;
- stock-aware order acceptance.

## 9.5 Globalization
Добавить:
- i18n;
- l10n;
- multi-currency;
- tax profiles;
- regional compliance abstraction;
- country packs.

## 9.6 White-label / Enterprise
Добавить:
- stronger branding;
- deployment options;
- enterprise roles;
- advanced security;
- SSO/SAML/OIDC;
- tenant partitions;
- premium integrations.

## 9.7 Marketplace of Integrations
Позже добавить:
- adapters registry;
- integration templates;
- managed connectors;
- partner-facing integration docs;
- app/integration marketplace.

---

# 10. Нецелевые компромиссы

ИИ не должен жертвовать архитектурой ради локального ускорения в следующих областях:
- multi-tenancy;
- authorization boundaries;
- extensibility;
- localization readiness;
- domain clarity;
- offline consistency;
- payment safety;
- auditability;
- observability.

Также нельзя превращать проект в “быстрое демо”, если решение потом заблокирует:
- международный запуск;
- новые каналы продаж;
- поддержку сетей;
- сложные pricing/promotions;
- интеграции.

---

# 11. Принципы, которые ИИ обязан сохранять

## 11.1 Domain-first development
Новая функциональность должна проектироваться через домены, контракты и жизненные циклы сущностей, а не через случайные endpoints.

## 11.2 Shared core, channel-specific shells
POS, kiosk, storefront, QR и другие каналы должны переиспользовать общее commerce-ядро.

## 11.3 Configurable behavior
Поведение меняется конфигами и правилами, а не разветвлениями по tenant_id.

## 11.4 Global-ready by design
Даже если локализация еще не реализована полностью, новые модули должны быть готовы к ней.

## 11.5 Product evolution over one-off requests
Вся новая работа должна усиливать платформу, а не решать единичную задачу ценой системной деградации.

---

# 12. Разделение целевого видения и внедрения

## 12.1 Target Product Vision
Идеальная целевая форма продукта:
- глобальная unified commerce SaaS-платформа;
- online + offline продажи;
- многобрендовый и многоточечный control plane;
- расширяемый движок бизнес-логики;
- strong localization;
- monetizable product platform.

## 12.2 Adoption & Rollout Path
Достижение этого состояния должно идти постепенно:
1. baseline core;
2. production readiness;
3. online channel expansion;
4. delivery / loyalty / stock;
5. localization & country enablement;
6. network and multi-business readiness;
7. enterprise / white-label / ecosystem scale.

---

# 13. Главный ориентир для ИИ

При любой новой задаче ИИ должен проверять:

1. Усиливает ли это продукт как платформу?
2. Сохраняет ли это multi-tenant чистоту?
3. Не создает ли это форк логики под одного клиента?
4. Не ломает ли это будущую локализацию и глобализацию?
5. Переиспользует ли это общее commerce-ядро?
6. Готово ли это к нескольким точкам, брендам и каналам?
7. Будет ли это понятно и поддерживаемо через год?

Если ответ хотя бы на несколько пунктов отрицательный, решение должно быть пересмотрено.


---

# Current Baseline and Target Gap
## Что уже реализовано и что еще нужно для конечного продукта

### Дата: 2026-03-18

---

# 1. Назначение документа

Документ нужен, чтобы ИИ не путал:
- уже реализованный baseline;
- целевой конечный продукт;
- стратегические разрывы между текущим состоянием и целью.

---

# 2. Уже реализованный baseline

На основе текущей реализации уже закрыты 10 фаз.

## 2.1 Реализованные платформенные основы
- monorepo;
- модульный backend;
- shared contracts;
- migrations;
- RLS helper/policies;
- CI/CD baseline;
- readiness and metrics endpoints;
- request ids и structured logging.

## 2.2 Реализованные домены
- auth;
- tenants;
- brands;
- stores;
- users;
- roles;
- permissions;
- devices;
- audit;
- settings;
- feature flags;
- catalog;
- pricing;
- carts;
- orders;
- order events;
- POS runtime;
- kitchen runtime;
- order board;
- kiosk runtime;
- payments abstraction;
- owner analytics;
- customization layer.

## 2.3 Что baseline уже доказывает
Текущая система уже доказывает, что архитектурный фундамент выбран правильно:
- single backend model работает;
- modular monolith подходит;
- multi-tenant модель жизнеспособна;
- базовое разделение на каналы продаж возможно;
- domain growth по фазам уже подтвержден на практике.

---

# 3. Что baseline пока не закрывает полностью

Хотя 10 фаз завершены, baseline еще не равен конечному продукту.

Ниже перечислены стратегические gaps.

## 3.1 Глобализация и локализация
- нет системной i18n/l10n модели;
- нет language packs;
- нет locale-aware content governance;
- нет multi-currency policy layer;
- нет country-level tax/regulatory abstraction.

## 3.2 Online commerce как полноценный канал
- storefront;
- customer-facing public catalog;
- online customer cart;
- online checkout;
- web customer identity;
- order tracking;
- QR ordering в полном виде;
- customer notifications;
- channel-specific promotional flows.

## 3.3 Delivery / fulfillment depth
- zones;
- service areas;
- ETA;
- pickup orchestration;
- courier workflows;
- dispatch basics;
- delivery economics.

## 3.4 Loyalty / CRM
- customer account model;
- loyalty engine;
- points;
- coupons;
- customer segment logic;
- repeat purchase incentives.

## 3.5 Inventory / warehouse
Пока нет отдельного производственного/складского контура.

## 3.6 Production-grade integrations
- real payment providers;
- real webhooks;
- refunds/voids;
- settlement import;
- fiscal adapters;
- printer adapters;
- hardware bridge strategy.

## 3.7 Localization-aware business rules
Пока rules layer не учитывает в полной мере:
- региональные ограничения;
- налоговые режимы;
- юридические особенности стран;
- локальные платежные и чековые сценарии.

## 3.8 Enterprise-grade identity and security
- SSO/SAML/OIDC для enterprise;
- tenant-level advanced security policies;
- fine-grained compliance packs;
- stronger secrets segmentation.

## 3.9 Marketplace / ecosystem layer
- partner integration model;
- public partner contracts;
- extension registry;
- managed app/integration ecosystem.

---

# 4. Как трактовать текущую реализацию

ИИ не должен трактовать baseline как “почти финальный продукт”.
Правильная трактовка:
- **baseline = зрелый фундамент**
- **future work = продуктовая и рыночная эволюция**

---

# 5. Ключевые технологические и продуктовые разрывы

## 5.1 Platform gaps
- external observability stack;
- multi-instance metrics and tracing;
- stronger secrets management;
- mature async processing patterns;
- more advanced CI/CD rollout patterns.

## 5.2 Commerce gaps
- promotions;
- coupons;
- loyalty;
- advanced fulfillment;
- customer profile;
- storefront;
- advanced returns/refunds.

## 5.3 International gaps
- i18n content;
- tax abstraction;
- currency abstraction;
- country-specific payment/fiscal workflows;
- locale-aware templates.

## 5.4 Customer acquisition gaps
- product packaging;
- self-onboarding;
- billing;
- trial flows;
- sales/admin/operator onboarding flows;
- documentation for external customers.

---

# 6. Практический вывод

Уже построен хороший backend-first SaaS core.
Теперь продукт должен эволюционировать в:
- глобальную;
- многоканальную;
- интеграционно богатую;
- локализуемую;
- коммерчески упакованную платформу.


---

# Evolution Roadmap
## Полная дорожная карта развития продукта после baseline v1

### Дата: 2026-03-18

---

# Волны развития продукта

## WAVE 1 — Product Maturity & Production Fit
- domain-driven product UX вместо thin CRUD;
- onboarding tenant/store/device;
- device security hardening;
- external observability stack;
- provider configs / secrets handling;
- analytics precompute basics.

## WAVE 2 — Globalization & Localization
- i18n for web/mobile/device UIs;
- localized content storage;
- currency abstraction;
- locale-aware formatting;
- country-aware taxes/compliance flags;
- country profiles.

## WAVE 3 — Online Commerce Expansion
- storefront module;
- public catalog pages;
- customer carts;
- customer checkout;
- guest/authenticated customer flows;
- QR ordering;
- order tracking;
- customer notifications.

## WAVE 4 — Delivery & Fulfillment
- delivery zones;
- fees and ETA logic;
- pickup orchestration;
- courier/operator workflows;
- dine-in/table flows;
- promised time windows.

## WAVE 5 — Loyalty, CRM, Promotions
- customer profiles;
- loyalty balance;
- points;
- coupons/promocodes;
- retention hooks;
- segmentation.

## WAVE 6 — Inventory & Supply Flows
- stock model;
- stop-list automation;
- warehouse-lite;
- ingredient-level stock;
- stock-aware ordering;
- supply receiving.

## WAVE 7 — Integrations & Hardware Ecosystem
- acquiring provider integrations;
- fiscal providers;
- printer adapters;
- scanner/barcode flows;
- terminal integrations;
- webhook framework.

## WAVE 8 — Billing, Packaging, Monetization Engine
- subscription plans;
- plan enforcement;
- limits by tenant/store/device/module;
- self-serve billing;
- invoices;
- free trial;
- partner / reseller model.

## WAVE 9 — Network / Multi-business / White-label Expansion
- stronger brand hierarchies;
- multi-business ownership model;
- org structures;
- template cloning;
- white-label branding packs.

## WAVE 10 — Enterprise & Compliance Readiness
- SSO/SAML/OIDC;
- stronger secrets management;
- audit export;
- advanced role policies;
- environment isolation options;
- compliance packs.

## WAVE 11 — Platform Ecosystem & Marketplace
- integration registry;
- partner SDK/contracts;
- extension marketplace;
- public developer docs;
- connector templates.

---

# Новые фазы после baseline

## PHASE 11 — Product Maturity
## PHASE 12 — Globalization & Localization
## PHASE 13 — Online Commerce
## PHASE 14 — Delivery & Fulfillment
## PHASE 15 — Loyalty, CRM, Promotions
## PHASE 16 — Integrations & Hardware
## PHASE 17 — Monetization Engine
## PHASE 18 — Inventory & Supply
## PHASE 19 — Multi-business / Network / White-label
## PHASE 20 — Enterprise / Compliance / Ecosystem

---

# Принцип развития
1. Stabilize
2. Globalize
3. Expand channels
4. Deepen operations
5. Monetize
6. Scale organizationally
7. Open ecosystem


---

# Globalization and Localization Strategy
## Как превратить текущую платформу в международно готовый продукт

### Дата: 2026-03-18

---

# Что входит в localization / globalization
- UI localization
- content localization
- formatting localization
- regulatory / country localization
- commerce localization

# Что должно появиться
- localization service;
- translation registry;
- locale resolution service;
- currency/tax policy layer;
- country profile model;
- localized template rendering.

# Минимум следующей фазы
- централизованный i18n подход для web/mobile;
- locale and language preferences;
- multilingual catalog fields;
- locale-aware formatters;
- country and currency config model;
- translation fallback strategy;
- localized notifications/templates foundation.

# Запрещенные ошибки
- хардкодить тексты в компонентах и backend responses;
- привязывать одну валюту ко всему tenant без модели контекста;
- считать, что taxes одинаковы для всех стран;
- смешивать localization и branding в одну сущность;
- делать разные if/else по странам по всему коду без country policy layer.


---

# Monetization and Licensing Model
## Как продукт должен зарабатывать и как это влияет на архитектуру

### Дата: 2026-03-18

---

# Подходящие модели монетизации
- subscription by tenant
- per store pricing
- per device pricing
- per module pricing
- usage-based pricing
- setup / onboarding fee
- custom work / enterprise services
- reseller / partner / franchise model

# Тарифные уровни
## Starter
- одна точка
- базовые продажи
- ограниченное число устройств

## Growth
- multi-store
- kiosk
- kitchen/board
- richer analytics
- branded UI
- delivery basic

## Pro / Network
- advanced org model
- loyalty
- storefront
- advanced reporting
- advanced rules
- integration packs

## Enterprise
- SSO
- advanced security
- premium support
- custom integrations
- dedicated options later

# Необходимые сущности
- plan
- subscription
- entitlement
- usage record
- invoice
- billing account
- add-on
- reseller account
- contract profile

# Вывод для ИИ
Новые модули нужно проектировать так, чтобы потом можно было ответить:
- можно ли это продавать отдельно?
- можно ли это включать по тарифу?
- можно ли это ограничить по количеству?
- можно ли это открыть только части клиентов?
- можно ли это вынести как premium/enterprise capability?


---

# Rollout and Adoption Model
## Как продукт должен постепенно внедряться на рынок и в разных сегментах клиентов

### Дата: 2026-03-18

---

# Сегменты клиентов
- Single SMB
- Multi-store SMB
- Multi-business Owner
- Network / Franchise / Partner
- Enterprise

# Этапы внедрения
1. Operational Core
2. Self-service & Online Entry
3. Omnichannel
4. Growth Layer
5. Network Layer
6. Enterprise Layer

# Вертикали
## Food-service first
POS, kiosk, kitchen, board, delivery/pickup, modifiers, combos, stop-lists.

## Retail next
scanner/barcode, simpler kitchen-free flow, stock/inventory, receipts and returns, catalog by SKU.

# Вывод
Новые функции нельзя проектировать как обязательные для всех клиентов сразу.
Нужно думать: кто это использует, когда включается, на каком тарифе, на каком рынке и в каком канале.


---

# AI Engineering Directive
## Обязательные правила для ИИ при дальнейшей разработке проекта

### Дата: 2026-03-18

---

# Неприкосновенные принципы
- не ломать single-backend multi-tenant модель;
- не плодить tenant-specific forks;
- не размывать bounded contexts;
- не дублировать уже существующий runtime;
- не писать быстрые решения ценой будущего масштаба.

# Перед новым кодом ИИ должен ответить
1. К какому домену это относится?
2. Это core, add-on, premium или enterprise?
3. Это tenant/store/channel/country scoped?
4. Это участвует в entitlements?
5. Как это связано с localization?
6. Какие события и lifecycle у сущности?
7. Можно ли это протестировать изолированно?
8. Не дублирует ли это существующую логику?

# Главное правило
ИИ должен писать код не только “чтобы работало сейчас”, а чтобы продукт мог эволюционировать к глобальной unified commerce platform без переписывания ядра.


---

# AI Session Protocol
## Как ИИ должен использовать vision-документы в каждой новой сессии

### Дата: 2026-03-18

---

# Обязательный порядок чтения
1. `01_MASTER_TARGET_VISION.md`
2. `02_CURRENT_BASELINE_AND_TARGET_GAP.md`
3. `03_EVOLUTION_ROADMAP.md`
4. `07_AI_ENGINEERING_DIRECTIVE.md`
5. профильный документ по теме

# Формат работы в начале сессии
ИИ должен сначала сформулировать:
- где находится проект сейчас;
- к какому target state идет;
- в какую волну/фазу попадает текущая задача;
- что уже есть в baseline и что нужно переиспользовать.

# Когда нужен новый ADR
Если решение меняет слой архитектуры, добавляет стратегический домен, меняет правила кастомизации или влияет на future waves.


---

# Future Phases Backlog
## Новые фазы разработки после уже завершенных 10 этапов

### Дата: 2026-03-18

---

## PHASE 11 — Product Maturity & Production Fit
- product UX вместо thin CRUD
- tenant/store/device onboarding
- kiosk public token hardening
- external observability stack
- secrets handling
- analytics precompute basics

## PHASE 12 — Globalization & Localization
- i18n infrastructure
- locale-aware domain modeling
- multilingual catalog/content
- currency/tax layer
- country profiles
- localized templates and notifications

## PHASE 13 — Online Commerce
- storefront
- public catalog
- online cart/checkout
- guest/customer flows
- QR ordering
- order tracking
- notifications

## PHASE 14 — Delivery & Fulfillment
- delivery zones
- pickup
- dine-in/table logic
- courier workflows
- ETA/SLA
- fulfillment policies

## PHASE 15 — Loyalty / CRM / Promotions
- customer profiles
- loyalty balances
- coupons/promos
- segmentation
- retention hooks
- repeat order experience

## PHASE 16 — Integrations & Hardware
- real payment providers
- refund/void/settlement flows
- fiscal adapters
- printer adapters
- hardware bridge contracts
- webhooks and connector contracts

## PHASE 17 — Billing / Plans / Monetization
- plans/subscriptions
- entitlements
- limits and quotas
- billing accounts
- invoicing
- trials
- reseller support

## PHASE 18 — Inventory & Supply
- stock and movements
- warehouse-lite
- ingredient stock
- stop-list automation
- supply receiving
- stock-aware ordering

## PHASE 19 — Network / Multi-business / White-label
- advanced org model
- multi-business ownership
- rollout templates
- network governance
- white-label branding packs
- partner management basics

## PHASE 20 — Enterprise / Compliance / Ecosystem
- SSO/SAML/OIDC
- audit export
- compliance packs
- environment/deployment variants
- partner SDK foundations
- ecosystem registry
- marketplace foundations
