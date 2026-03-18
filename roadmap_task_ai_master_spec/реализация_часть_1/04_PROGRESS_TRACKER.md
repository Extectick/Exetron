# Progress Tracker

## Инструкция
Этот файл должен обновляться ИИ после каждого существенного шага.

---

# 1. Текущий статус проекта

## Активный этап
- Current Phase: `PHASE 10`

## Текущий спринт / итерация
- Current Iteration Goal: `Реализовать и закрыть PHASE 10 Hardening & Production Readiness`

## Общий прогресс
- Phase 0: Completed
- Phase 1: Completed
- Phase 2: Completed
- Phase 3: Completed
- Phase 4: Completed
- Phase 5: Completed
- Phase 6: Completed
- Phase 7: Completed
- Phase 8: Completed
- Phase 9: Completed
- Phase 10: Completed

---

# 2. Done
- Инициализирован новый git-репозиторий и monorepo на `pnpm + Turborepo`
- Добавлены root configs, Docker Compose, `.env.example`, CI workflow, local turbo launcher
- Созданы `apps/api`, `apps/web`, `apps/mobile`, shared packages `config/contracts/database/types`
- Зафиксированы Prisma schema, generated client, baseline migration и RLS helper/policy layer
- Реализован NestJS platform core API: auth, tenants, brands, stores, users, roles, permissions, devices, audit, settings, feature flags
- Реализован live Postgres bootstrap на Dockerized services, migration/seed flow и e2e smoke для PHASE 1
- Расширена Prisma schema и applied migration `20260317121417_phase2_catalog_pricing`
- Реализованы NestJS catalog/pricing modules: categories, products, variants, modifiers, price lists, store catalog overrides, compiled catalog, price preview
- Для новых Phase 2 таблиц добавлены PostgreSQL RLS policies
- Реализован Next.js admin shell: login, dashboard, CRUD/view workspaces + Phase 2 catalog/pricing pages
- Добавлен Expo scaffold с shared API base config
- Добавлены docs по architecture/API/local-dev
- Пройдены проверки: workspace `lint`, `typecheck`, `test`, `build`, API `test:e2e`
- Расширена Prisma schema и applied migration `20260317195000_phase3_orders_core`
- Реализован backend-first PHASE 3 Orders Core: carts, checkout, orders, transitions, order events
- Добавлены Phase 3 unit tests и live e2e сценарии для orders runtime
- Расширена Prisma schema и applied migration `20260317213000_phase4_pos_runtime`
- Реализован PHASE 4 POS runtime: shifts, POS sessions, payment intents, payment allocations
- Добавлен NestJS `pos` module с POS bootstrap, shift/session lifecycle и payment initiation endpoints
- Expo mobile обновлен до POS skeleton с offline-lite cache, local pending queue и queue replay
- Добавлен live e2e сценарий `phase4-pos.e2e-spec.ts`
- Выровнены React type dependencies в workspace и восстановлены root `typecheck/build`
- Расширена Prisma schema и applied migration `20260317235500_phase5_kitchen_board`
- Реализован PHASE 5 Kitchen & Order Board: kitchen tickets, station routing basics, board feed, realtime gateway
- Orders runtime интегрирован с kitchen handoff persistence и kitchen-driven order status sync
- Добавлены thin web pages `/kitchen` и `/order-board`
- Добавлен live e2e сценарий `phase5-kitchen.e2e-spec.ts`
- Расширена Prisma schema и applied migration `20260318003000_phase6_kiosk_runtime`
- Реализован PHASE 6 Kiosk: public kiosk bootstrap, branded self-service UI, kiosk checkout и payment handoff basics
- Added NestJS `kiosk` module with public `GET /kiosk/bootstrap` and `POST /kiosk/checkout`
- Public kiosk route `/kiosk/[deviceId]` добавлен в Next.js web app
- Kiosk runtime интегрирован с existing cart/checkout/order flow и kitchen ticket creation через auto-confirmed paid orders
- Исправлено device-authored cart/order creation: `createdByUserId` больше не заполняется `device.id`
- Добавлен live e2e сценарий `phase6-kiosk.e2e-spec.ts`
- Расширена Prisma schema и applied migration `20260318110000_phase7_payments_abstraction`
- Реализован PHASE 7 Payments: canonical `payments` runtime, provider configs, payment attempts, reconciliation summary
- POS compatibility wrapper `/pos/payment-intents` переведен на новый payments service с real allocation processing
- Kiosk checkout переведен на generic payment tables; новые `KioskPaymentHandoff` больше не создаются
- Expo POS обновлен до mixed payment completion flow, kiosk UI обновлен под success/failure states
- Добавлены thin web pages `/payment-provider-configs`, `/payments`, `/payment-reconciliation`
- Добавлен live e2e сценарий `phase7-payments.e2e-spec.ts`
- Расширена Prisma schema и applied migration `20260318123000_phase8_analytics_owner_cabinet`
- Реализован PHASE 8 Analytics & Owner Cabinet: owner dashboard aggregates, store comparison, top products, cancellations/refunds summary
- Добавлен `analytics` module с `GET /analytics/owner-cabinet`, `GET /analytics/snapshots`, `POST /analytics/snapshots`
- Added `AnalyticsSnapshot` persistence with audit/outbox and RLS
- Web admin расширен owner cabinet page `/owner-cabinet`
- Добавлен unit test `analytics-runtime.util.spec.ts` и live e2e сценарий `phase8-analytics.e2e-spec.ts`
- Расширена Prisma schema и applied migration `20260318143000_phase9_customization_layer`
- Реализован PHASE 9 Customization Layer: branding configs, customization rules, deterministic rules executor и effective customization evaluation
- Добавлен `customization` module с `GET|POST|PATCH /customization/branding`, `GET|POST|PATCH /customization/rules`, `POST /customization/evaluate`
- Kiosk runtime переведен на effective customization resolution с channel/point-specific behavior
- Web admin расширен thin page `/customization`
- Добавлены tests `customization-runtime.util.spec.ts` и live e2e сценарий `phase9-customization.e2e-spec.ts`
- Реализован PHASE 10 Hardening & Production Readiness: structured logging, request ids, metrics, readiness checks, standardized error envelopes и CI/CD hardening
- API расширен observability endpoints `GET /health`, `GET /health/live`, `GET /health/readiness`, `GET /health/metrics`
- Добавлен root gate `test:critical` для critical flow coverage
- GitHub Actions CI расширен до build, live Postgres e2e и release artifact packaging
- Добавлены docs по production readiness, migration safety, performance review и security hardening
- Добавлен live e2e сценарий `phase10-hardening.e2e-spec.ts`
- Web lint pipeline переведен с deprecated `next lint` на ESLint CLI + Next `core-web-vitals` config без build-time warning про missing Next plugin
- Workspace `turbo` verification cleanup: test tasks больше не декларируют phantom coverage outputs, локальные и CI прогоны идут без этого warning

# 3. In Progress
- _пусто_

# 4. Blocked
- _пусто_

# 5. Next
- Зафиксировать post-phase backlog и итоговый implementation baseline после PHASE 10
- При необходимости вынести observability в external stack (Prometheus/Grafana/OpenTelemetry)
- Вернуться к оставшемуся техдолгу: kiosk public token, real payment providers, analytics precompute

---

# 6. Решения, принятые по ходу работы
- Monorepo: `pnpm + Turborepo`
- Backend architecture: NestJS modular monolith
- Data access: Prisma + PostgreSQL
- Tenant isolation: app-layer guards/specifications + PostgreSQL RLS policies
- Auth: local email/password + access/refresh JWT
- Clients: Next.js admin shell now, Expo scaffold for later POS/Kiosk phases
- PHASE 4 добавляет device-facing POS runtime: POS reuse existing carts/orders/catalog APIs, а offline-lite ограничен cache + pending queue replay без full local-first replication
- PHASE 5 добавляет kitchen/board runtime как thin operational layer: tickets живут отдельно от orders, а realtime ограничен store-scoped websocket rooms без выделенного event bus outside monolith
- PHASE 6 строит kiosk как public web/PWA-first runtime поверх existing pricing/orders/kitchen модулей; payment handoff phase был intentionally shallow и затем свернут в PHASE 7
- PHASE 7 вводит canonical payments runtime: intents, allocations, attempts и provider configs shared между POS и kiosk, а default order sync policy зависит от channel/provider config
- PHASE 8 строит owner analytics поверх transactional orders/payments без отдельного data warehouse; snapshots добавлены как lightweight persisted report artifact
- PHASE 9 формализует customization layer отдельным runtime: `settings` и `feature-flags` остаются foundation, а branding configs и rules executor добавляют managed variability без канал-специфичных форков
- PHASE 10 делает hardening без нового domain schema: observability, standardized error handling, runtime probes и CI/CD gates добавляются поверх существующего modular monolith
- Workspace bootstrap учитывает среду без глобального `pnpm` через `corepack` и repo-local shim
- Локальный Postgres для проекта переведен на `localhost:5433`, чтобы не конфликтовать с установленным на машине `postgres.exe`
- Compiled catalog и price preview остаются REST-only в PHASE 2; отдельный POS UI отложен до следующих фаз
- Orders Core в PHASE 3 остается backend-first: cart агрегат отдельный от order, checkout сохраняет immutable snapshot, kitchen handoff пока только event contract

---

# 7. Технический долг
- Web admin все еще опирается на generic CRUD workspaces; Phase 3+ стоит перевести на доменно-специфичные формы и workflows
- Price list items и availability windows редактируются через JSON payloads в thin admin UI; нужен более удобный редактор
- Device bootstrap secret сейчас только вычисляется и фиксируется в event payload; полноценный device-auth onboarding нужен в следующих итерациях
- RLS для новых Phase 2 таблиц включен и применен, но отдельный non-superuser integration test для policy enforcement еще не выделен
- PHASE 3 не добавляет admin UI для orders; при открытии Phase 5/6 потребуется определить thin ops UI или device-facing clients
- Реализованный PHASE 7 payments runtime все еще работает только на simulated providers; acquiring APIs, webhooks, refunds/voids и settlement import остаются вне scope
- Offline-lite в PHASE 4 остается queue-based и не включает full bidirectional sync/conflict resolution
- PHASE 5 station routing пока опирается только на `kitchen.routing` setting с product/category maps; полноценный routing/rules engine пока не нужен
- Realtime в PHASE 5 покрывает только online clients; persisted subscriptions/replay/history для board feed пока не реализованы
- Public kiosk route пока опирается только на `deviceId`; отдельный device access token или signed public bootstrap URL пока не введены
- Payment provider configs пока хранят JSON settings без отдельного secrets-management слоя
- PHASE 8 analytics сейчас считаются on-demand по transactional таблицам; если объем данных вырастет, понадобится precomputed read model/materialized aggregation layer
- PHASE 9 rules engine intentionally simple: JSON conditions/actions без DSL compiler, dry-run history или versioned rollout workflow
- PHASE 10 metrics пока in-memory и process-local; для multi-instance production все еще нужен внешний metrics/tracing stack

---

# 8. Обновление статуса
После каждой итерации ИИ должен обновлять:
1. Current Phase
2. Done
3. In Progress
4. Blocked
5. Next
6. Решения
7. Технический долг
