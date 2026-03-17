# Architecture Decisions

## ADR-001 — Backend Architecture
Принято: использовать modular monolith на NestJS.
Причина:
- быстрее старт;
- ниже operational complexity;
- удобнее для multi-tenant SaaS;
- достаточно масштабируемо для начального и среднего роста.

## ADR-002 — Data Storage
Принято: PostgreSQL как основная транзакционная БД.
Причина:
- надежная реляционная модель;
- удобно для tenant/store/entity связей;
- поддержка RLS;
- сильная экосистема.

## ADR-003 — Cache / Queue / Realtime Support
Принято: Redis.
Причина:
- кэш;
- очереди;
- pub/sub паттерны;
- поддержка realtime-слоя.

## ADR-004 — Frontend Web
Принято: Next.js.
Причина:
- быстрый старт;
- сильная экосистема;
- удобно для админок, кабинетов, dashboard'ов и web/PWA.

## ADR-005 — Android Apps
Принято: React Native + Expo.
Причина:
- быстрое создание Android clients;
- общий TS-стек;
- удобство для device-facing приложений.

## ADR-006 — Windows Strategy
Принято: web/PWA first.
Причина:
- быстрее старт;
- меньше complexity;
- можно позже добавить desktop wrapper, если будут реальные device-specific ограничения.

## ADR-007 — Customization Strategy
Принято: config + feature flags + rules + extensions.
Причина:
- позволяет избежать форков;
- централизует логику;
- подходит для SaaS-модели.

## ADR-008 — Tenant Isolation
Принято: app-layer isolation + строгая data discipline + optional RLS как дополнительная защита.
Причина:
- контролируемая multi-tenant архитектура;
- меньше рисков утечек;
- лучше масштабируемость.

## ADR-009 — Offline Strategy
Принято: offline-lite для POS и kiosk.
Причина:
- точка должна переживать кратковременную потерю связи;
- не нужно строить full local-first distributed system на старте.

## ADR-010 — Internal Integration Style
Принято: event-driven внутри modular monolith.
Причина:
- слабая связанность модулей;
- удобство расширения;
- подготовка к возможной эволюции архитектуры.

## ADR-011 — Monorepo Toolchain
Принято: `pnpm + Turborepo`.
Причина:
- общий workflow для backend/web/mobile;
- shared packages без дублирования контрактов;
- простая оркестрация build/test/typecheck.

## ADR-012 — Data Access Layer
Принято: Prisma как основной ORM/migration слой ранних фаз.
Причина:
- быстрый старт для foundation и platform core;
- типизированный client для backend;
- понятная миграционная история и seed flow.

## ADR-013 — Authentication Flow
Принято: local auth + access/refresh JWT на PHASE 1.
Причина:
- минимально достаточный identity path для platform core;
- не блокирует tenant/user/RBAC/device foundation;
- внешний OIDC/IdP можно добавить позже без ломки core domain.

## ADR-014 — Testing Baseline
Принято: workspace `typecheck/test/build` + unit tests в API как baseline, а live integration/e2e выполнять поверх Dockerized Postgres.
Причина:
- позволяет быстро валидировать foundation и platform core код;
- не привязывает начальный цикл к полной инфраструктуре;
- оставляет путь к более тяжелым integration/e2e тестам в hardening-фазе.

## ADR-015 — Corepack Bootstrap Compatibility
Принято: хранить repo-local shim для `pnpm` и launcher для `turbo`.
Причина:
- текущая среда не имеет глобального `pnpm`;
- workspace должен работать через `corepack` без ручной системной настройки;
- это стабилизирует локальные команды `build/test/typecheck`.

## ADR-016 — Phase 2 Catalog Modeling
Принято: catalog/pricing хранить как tenant-scoped domain с polymorphic pricing targets (`PRODUCT`, `VARIANT`, `MODIFIER_OPTION`) и explicit store overrides.
Причина:
- покрывает menu/catalog use-cases без отдельного pricing engine;
- позволяет реализовать deterministic preview и compiled catalog API;
- оставляет пространство для promotions/checkout phase later без переделки foundation schema.

## ADR-017 — Catalog Availability And Pricing Resolution
Принято: compiled catalog и preview рассчитывать синхронно в приложении по фиксированному precedence:
- store override
- price list item
- variant base price
- product base price
- modifier option deltas

Причина:
- поведение прозрачно и предсказуемо для admin/POS flows;
- нет зависимости от внешнего pricing service на ранних фазах;
- unit/e2e проверки могут валидировать поведение end-to-end.
