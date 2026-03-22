# Refine Admin Migration

## Status

- Status: `PLANNED`
- Owner: `AI implementation package`
- Scope: полный переход `apps/web` admin layer на `Refine + Ant Design`
- Source of truth: только этот пакет в `docs/ai/refine-admin-migration/`

## Purpose

Этот пакет фиксирует полное ТЗ и технический план перехода с текущей
самописной admin shell на новую админку для `Exetron`, построенную на
`Refine + Ant Design 5`.

Документация написана для ИИ-исполнителей и инженеров, которые будут
выполнять миграцию пошагово без повторного проектирования интерфейсов,
роутинга и provider-слоя.

## Locked Decisions

- `apps/web` остается одним приложением.
- Admin layer полностью переписывается внутри существующего `apps/web`.
- Новый admin layer строится на `Next.js App Router + Refine + Ant Design 5`.
- Public kiosk route `kiosk/[deviceId]` сохраняется вне Refine admin shell.
- Маршрут `/login` сохраняется, но полностью переписывается под новый дизайн и
  Refine-compatible auth flow.
- Backend API не перепроектируется под миграцию; UI садится на существующие
  REST-контракты.
- Legacy admin shell удаляется только после достижения route и screen parity.

## Non-Goals

- Вынесение админки в отдельное приложение.
- Переписывание backend ради удобства frontend.
- Миграция kiosk runtime на Refine.
- Внедрение внешнего IdP, SSO или server-side session management.
- Параллельная поддержка двух полноценных admin UI на долгий срок.

## Package Structure

- `00_README.md`
  Цель пакета, статус и базовые решения.
- `01_PRODUCT_REQUIREMENTS.md`
  Продуктовые требования к новой админке.
- `02_INFORMATION_ARCHITECTURE.md`
  Навигация, страницы и экранная иерархия.
- `03_TECHNICAL_ARCHITECTURE.md`
  Архитектура frontend-слоя, providers, routing, layout и стратегия удаления
  legacy shell.
- `04_RESOURCE_MATRIX.md`
  Точная матрица ресурсов, backend endpoint-ов и page archetype-ов.
- `05_IMPLEMENTATION_PLAN.md`
  Фазовый план реализации с зависимостями и definition of done.
- `06_ACCEPTANCE_TEST_PLAN.md`
  Acceptance, permission, regression и visual сценарии.
- `07_TASK_BOARD.md`
  Исполнительский task board для ИИ-агентов и человека.

## Reading Order

1. Прочитать `01_PRODUCT_REQUIREMENTS.md`.
2. Зафиксировать IA из `02_INFORMATION_ARCHITECTURE.md`.
3. Реализовывать foundation только по `03_TECHNICAL_ARCHITECTURE.md`.
4. Для каждого экрана сверяться с `04_RESOURCE_MATRIX.md`.
5. Работать фазами из `05_IMPLEMENTATION_PLAN.md`.
6. Закрывать задачу только после прохождения сценариев из
   `06_ACCEPTANCE_TEST_PLAN.md`.
7. Отмечать прогресс в `07_TASK_BOARD.md`.

## Current State

Текущее состояние `apps/web`:

- `Next.js 15` на `App Router`
- свой `AuthProvider` на базе `login/me/logout`
- свой `ProtectedShell`
- flat navigation
- generic `ResourceWorkspace` для части CRUD-экранов
- кастомные страницы для operational screens и public kiosk

Эта архитектура считается временной и подлежит полной замене в admin layer.

## Migration Principle

Миграция выполняется не как постепенное украшение текущей админки, а как
переход на новую структурную основу:

- `Refine` отвечает за resource graph, data hooks, auth integration, access
  control wiring и routing semantics.
- `Ant Design 5` отвечает за визуальную и interaction основу плотной B2B
  админки.
- `Exetron Admin Shell` отвечает за фирменный layout, grouped navigation,
  dashboard framing и единый UX для всех admin screens.

## Completion Condition

Пакет считается реализованным только когда:

- все admin routes работают на новом Refine shell;
- legacy admin страницы из `src/app/(app)/**` удалены;
- `/login` работает на новом дизайне;
- `kiosk/[deviceId]` продолжает работать отдельно;
- сохранены текущие backend URL и auth semantics;
- приняты acceptance и regression сценарии из `06_ACCEPTANCE_TEST_PLAN.md`.
