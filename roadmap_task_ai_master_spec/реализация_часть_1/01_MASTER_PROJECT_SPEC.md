# Master Project Spec
## Универсальная SaaS-платформа для автоматизации офлайн-бизнеса

### Цель
Создать масштабируемую multi-tenant SaaS-платформу для автоматизации:
- POS / кассы
- kiosk / терминалов самообслуживания
- kitchen display
- order board
- кабинета владельца
- аналитики
- оплаты
- доставки
- гибкой кастомизации по tenant/store

---

# 1. Архитектурная цель

## Целевой стек
- Backend: NestJS
- DB: PostgreSQL
- Cache / Queue / Realtime support: Redis
- Web: Next.js
- Android apps: React Native + Expo
- Windows: web/PWA first, затем при необходимости desktop wrapper

## Архитектурный подход
- один backend для всех клиентов;
- strict multi-tenancy;
- modular monolith;
- config-driven customization;
- feature flags;
- rules engine;
- offline-lite для POS/kiosk;
- event-driven внутри монолита.

---

# 2. Основные доменные сущности
- Tenant
- Brand
- Store
- User
- Role
- Permission
- Device
- Product
- Category
- Modifier
- Order
- OrderItem
- Payment
- DeliveryOrder
- Rule
- FeatureFlag
- BrandingConfig
- AuditLog

---

# 3. Ключевые требования
- один backend для всех клиентов;
- изоляция данных клиентов;
- кастомизация по tenant и store;
- несколько точек на клиента;
- несколько способов оплаты;
- роли и права с custom roles;
- аналитика по точкам и в целом;
- offline-lite режим;
- SaaS-only модель на текущем этапе;
- серьезная архитектура под рост.

---

# 4. Стратегия кастомизации
Кастомизация не должна строиться через форки кода под клиента.

Используем 4 уровня:
1. Config
2. Feature flags
3. Rules
4. Extensions

---

# 5. Ограничения
- не использовать отдельный backend на каждого клиента;
- не начинать с микросервисов;
- не зашивать client-specific if/else по tenant_id в core;
- не строить full plugin marketplace на старте.

---

# 6. Главные delivery areas
1. Platform Core
2. Identity & RBAC
3. Tenant / Store management
4. Catalog
5. Orders
6. POS
7. Kitchen & Board
8. Kiosk
9. Payments
10. Analytics
11. Customization layer
12. Hardening / production readiness
