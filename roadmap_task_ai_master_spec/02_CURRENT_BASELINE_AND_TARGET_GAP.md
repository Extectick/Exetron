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
