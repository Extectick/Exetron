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

## ADR-018 — Orders Core Modeling
Принято: PHASE 3 строить вокруг отдельного `Cart` aggregate и immutable `Order` snapshot без отдельных read models.
Причина:
- cart изменения и checkout разделяются явно, без мутации уже созданных orders;
- checkout может переиспользовать текущий pricing resolver и сохранять resolved prices в snapshot;
- order history остается стабильной даже после catalog/pricing изменений;
- kitchen/payment domains не форсируются раньше своих фаз и остаются на event/status уровне.

## ADR-019 — POS Runtime In Phase 4
Принято: PHASE 4 строить как thin POS runtime поверх существующих catalog/pricing/orders модулей, не вводя отдельный payment engine или full local-first sync.
Причина:
- POS может переиспользовать уже готовые compiled catalog, cart и checkout flows без второй доменной ветки;
- shifts, POS sessions и payment intents дают достаточный операционный каркас для кассового контура;
- offline-lite через cached bootstrap + pending queue replay закрывает короткие сетевые сбои без сложности conflict-resolution;
- settlement, refund transactions, kitchen ticket persistence и realtime board остаются в следующих фазах, не размывая PHASE 4.

## ADR-020 — Kitchen Tickets And Order Board
Принято: PHASE 5 строить вокруг store-scoped `KitchenTicket` persistence и websocket room-модели `tenant + store`, не вынося kitchen runtime в отдельный сервис.
Причина:
- `Order` остается канонической сущностью заказа, а `KitchenTicket` становится operational projection для кухни и board;
- station routing basics можно закрыть конфигурацией `kitchen.routing` в settings, без тяжелого rule engine;
- realtime нужен только в рамках одной точки, поэтому room-based websocket gateway достаточно и не требует внешнего broker;
- kitchen transitions могут синхронизировать `Order.status`, сохраняя один основной lifecycle вместо параллельных статусов без связи.

## ADR-021 — Kiosk Runtime In Phase 6
Принято: PHASE 6 строить как public web/PWA-first kiosk runtime поверх existing compiled catalog, `Cart -> Checkout -> Order` и kitchen flow, не вводя полноценный payment engine.
Причина:
- kiosk reuse existing pricing/orders modules и не создает отдельную доменную ветку для self-service orders;
- public web route `/kiosk/[deviceId]` быстрее дает branded self-service UI, чем отдельный kiosk-native client;
- оплата в этой фазе фиксируется через shallow `KioskPaymentHandoff`, чего достаточно для handoff в основной order flow;
- provider-backed payment abstraction, retries/reconciliation и более строгий public device access token переносятся в PHASE 7 / hardening, не размывая PHASE 6.

## ADR-022 — Payments Abstraction In Phase 7
Принято: PHASE 7 вводит единый payments runtime для POS и kiosk вокруг `PaymentIntent`, `PaymentAllocation`, `PaymentAttempt` и `PaymentProviderConfig`.
Причина:
- POS и kiosk перестают иметь отдельные payment runtime ветки и используют один и тот же state machine;
- mixed payment остается на уровне allocations, поэтому partial/complete/failure состояния считаются детерминированно;
- store-level provider configs могут переопределять tenant defaults без форков или channel-specific таблиц;
- kiosk auto-confirm и POS no-auto-confirm-by-default выражаются через provider config policy, а не через hardcoded разветвления по channel;
- legacy `KioskPaymentHandoff` остается только для backward compatibility schema и больше не участвует в новом runtime.

## ADR-023 — Owner Analytics In Phase 8
Принято: PHASE 8 строить owner cabinet на live transactional данных `Order` + `PaymentIntent`, а snapshots хранить как lightweight persisted report artifacts в `AnalyticsSnapshot`.
Причина:
- нужные owner metrics уже доступны в operational schema, поэтому отдельный warehouse/read model пока избыточен;
- revenue summary, store comparison и top products можно детерминированно получить из paid orders без второй доменной ветки;
- snapshots дают зафиксированный отчетный артефакт без необходимости сразу строить scheduler/export pipeline;
- если объем данных вырастет, эту модель можно эволюционировать в materialized/precomputed analytics layer без переписывания owner-facing API.

## ADR-024 — Customization Layer In Phase 9
Принято: PHASE 9 строить как formal customization runtime поверх существующих `settings` и `feature-flags`, добавив отдельные `CustomizationBrandingConfig` и `CustomizationRule` таблицы, deterministic evaluator и point/channel scoping.
Причина:
- foundation config layer уже существовал, поэтому Phase 9 должен был усилить его, а не дублировать через новый канал-специфичный storage;
- branding configs и rules executor дают управляемую вариативность без форков kiosk/POS/board runtime;
- effective customization рассчитывается синхронно в приложении и может сразу использоваться в bootstrap/checkout flows;
- JSON-based rules/actions достаточно для текущего scope и не требуют преждевременно вводить отдельный DSL compiler, versioning workflow или external rule engine.

## ADR-025 — Hardening Strategy In Phase 10
Принято: PHASE 10 усиливает existing monolith через встроенный observability/runtime hardening слой и CI/CD gates, не вводя отдельный infra service или новый domain schema.
Причина:
- structured logs, request ids, readiness probes и metrics нужны уже сейчас, но для текущего масштаба достаточно process-local реализации внутри API;
- standardized error envelopes делают troubleshooting и smoke automation стабильнее без изменения бизнес-контрактов;
- critical-flow confidence достигается через live Postgres e2e в CI, а не только через unit tests;
- migration/rollback/performance/security discipline лучше зафиксировать отдельными operations docs и pipeline gates до появления внешнего deployment platform.
