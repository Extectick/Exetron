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
