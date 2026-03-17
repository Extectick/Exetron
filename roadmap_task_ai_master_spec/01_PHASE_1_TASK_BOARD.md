# PHASE 1 Task Board

## Phase
PHASE 1

## Goal
Реализовать основу SaaS-платформы: auth, tenant/store/user management, RBAC, device registration, audit logging, settings и feature flags foundation.

## Scope
- local auth + JWT
- tenants / brands / stores
- users / roles / permissions / store access
- device registration
- audit logging
- tenant/store settings
- feature flags foundation
- admin API and web control plane

## Deliverables
- рабочий REST API platform core на NestJS
- Prisma-backed schema and services for phase entities
- admin UI для login и CRUD/view сценариев
- shared DTO/contracts для backend/web/mobile
- unit tests и build/typecheck coverage

## Tasks
- [x] Реализовать auth module
- [x] Реализовать tenants / brands / stores modules
- [x] Реализовать users / roles / permissions modules
- [x] Реализовать devices / audit / settings / feature flags modules
- [x] Реализовать admin web shell с login и CRUD/view страницами
- [x] Добавить shared contracts/types/env packages
- [x] Добавить unit tests и workspace verification scripts
- [x] Выполнить live Postgres migration + seed + smoke verification

## Done
- Реализованы endpoints `auth/login`, `auth/refresh`, `auth/logout`, `auth/me`
- Реализованы CRUD/list endpoints для tenants, brands, stores, users, roles, devices
- Реализованы endpoints для audit, tenant/store settings, feature flags
- Добавлены JWT strategy, permission guard, request context, tenant/store access control
- Добавлена web admin shell с login, dashboard и resource workspaces
- Expo scaffold подключен к shared API base config
- Исправлен runtime wiring модулей `AuditModule` / `DomainEventsModule` и фильтрация tenant-level audit logs
- Live Postgres verification выполнен: `infra:up`, migration apply, seed и e2e smoke пройдены
- Unit tests API проходят; workspace `lint`, `typecheck`, `test`, `build` проходят

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Перевести active development на PHASE 2
- Расширить schema и API модули под catalog/pricing domain
