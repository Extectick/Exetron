# PHASE 0 Task Board

## Phase
PHASE 0

## Goal
Зафиксировать foundation architecture, структуру монорепо, доменную модель, стандарты разработки и базовые контракты для дальнейших фаз.

## Scope
- pnpm + Turborepo monorepo bootstrap
- repo structure for `api`, `web`, `mobile`, shared packages
- coding conventions, env strategy, CI baseline
- Prisma schema draft + baseline migration
- tenant isolation strategy
- event bus and outbox foundation
- OpenAPI / Swagger baseline
- admin shell and Expo scaffold

## Deliverables
- monorepo root config, scripts and CI
- `apps/api` NestJS platform core skeleton
- `apps/web` Next.js admin shell
- `apps/mobile` Expo scaffold
- `packages/database` Prisma schema, generated client, baseline migration
- architecture and operations docs in `/docs`

## Tasks
- [x] Уточнить scope этапа
- [x] Уточнить deliverables этапа
- [x] Сформировать backend foundation
- [x] Сформировать frontend foundation
- [x] Сформировать data model foundation
- [x] Сформировать API foundation
- [x] Сформировать docs
- [x] Сформировать tests baseline

## Done
- Инициализирован git-репозиторий и monorepo на `pnpm + Turborepo`
- Созданы `apps/api`, `apps/web`, `apps/mobile` и shared packages
- Добавлены root config files, Docker Compose, `.env.example`, CI workflow
- Зафиксированы Prisma schema, baseline migration и RLS helper/policy layer
- Подключены Swagger, shared contracts/types/config, event outbox foundation
- Добавлены foundation docs: architecture, API, local development
- Выполнены live migration, seed и baseline smoke verification на Dockerized Postgres

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- PHASE 0 закрыт
- Поддерживать foundation docs и root tooling при переходе к следующим фазам
