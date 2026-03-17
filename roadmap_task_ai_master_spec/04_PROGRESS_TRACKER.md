# Progress Tracker

## Инструкция
Этот файл должен обновляться ИИ после каждого существенного шага.

---

# 1. Текущий статус проекта

## Активный этап
- Current Phase: `PHASE 3`

## Текущий спринт / итерация
- Current Iteration Goal: `Закрыть PHASE 0 -> PHASE 2 и открыть очередь на PHASE 3`

## Общий прогресс
- Phase 0: Completed
- Phase 1: Completed
- Phase 2: Completed
- Phase 3: Not started
- Phase 4: Not started
- Phase 5: Not started
- Phase 6: Not started
- Phase 7: Not started
- Phase 8: Not started
- Phase 9: Not started
- Phase 10: Not started

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

# 3. In Progress
- Подготовка очереди работ для PHASE 3

# 4. Blocked
- _пусто_

# 5. Next
- Описать и открыть task board PHASE 3
- Спланировать cart/order/POS runtime modules без ломки текущих contracts
- Решить, нужны ли отдельные read models для order compilation и checkout pricing

---

# 6. Решения, принятые по ходу работы
- Monorepo: `pnpm + Turborepo`
- Backend architecture: NestJS modular monolith
- Data access: Prisma + PostgreSQL
- Tenant isolation: app-layer guards/specifications + PostgreSQL RLS policies
- Auth: local email/password + access/refresh JWT
- Clients: Next.js admin shell now, Expo scaffold for later POS/Kiosk phases
- Workspace bootstrap учитывает среду без глобального `pnpm` через `corepack` и repo-local shim
- Локальный Postgres для проекта переведен на `localhost:5433`, чтобы не конфликтовать с установленным на машине `postgres.exe`
- Compiled catalog и price preview остаются REST-only в PHASE 2; отдельный POS UI отложен до следующих фаз

---

# 7. Технический долг
- Web admin все еще опирается на generic CRUD workspaces; Phase 3+ стоит перевести на доменно-специфичные формы и workflows
- Price list items и availability windows редактируются через JSON payloads в thin admin UI; нужен более удобный редактор
- Device bootstrap secret сейчас только вычисляется и фиксируется в event payload; полноценный device-auth onboarding нужен в следующих итерациях
- RLS для новых Phase 2 таблиц включен и применен, но отдельный non-superuser integration test для policy enforcement еще не выделен
- `apps/web` пока использует `next lint`, который deprecated и должен быть мигрирован на ESLint CLI/Next plugin config до Next 16

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
