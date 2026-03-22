# Task Board

## Status Legend

- `[ ]` not started
- `[~]` in progress
- `[x]` done
- `[!]` blocked

## Phase A: Foundation

- [ ] Добавить зависимости `Refine + Ant Design 5` в `apps/web`.
- [ ] Создать admin root provider tree.
- [ ] Реализовать custom `authProvider`.
- [ ] Реализовать custom `dataProvider`.
- [ ] Реализовать custom `accessControlProvider`.
- [ ] Создать `Exetron Admin Shell`.
- [ ] Создать grouped navigation config.
- [ ] Зафиксировать light-first theme tokens.
- [ ] Переписать `/login`.
- [ ] Поднять новый `/dashboard`.
- [ ] Прогнать `typecheck`, `lint`, `build`.

## Phase B: Platform

- [ ] Реализовать `/onboarding`.
- [ ] Реализовать `/tenants`.
- [ ] Реализовать `/stores`.
- [ ] Реализовать `/users`.
- [ ] Реализовать `/roles`.
- [ ] Реализовать `/devices`.
- [ ] Добавить kiosk token issue action в `devices`.
- [ ] Проверить platform-admin и tenant user permission paths.

## Phase C: Catalog

- [ ] Реализовать `/brands`.
- [ ] Реализовать `/categories`.
- [ ] Реализовать `/products`.
- [ ] Реализовать `/product-variants`.
- [ ] Реализовать `/modifiers`.
- [ ] Реализовать `/modifier-options`.
- [ ] Реализовать `/price-lists`.
- [ ] Реализовать `/catalog-overrides`.
- [ ] Проверить parent-child flows для variants и options.

## Phase D: Control

- [ ] Реализовать `/settings`.
- [ ] Реализовать `/feature-flags`.
- [ ] Реализовать `/customization`.
- [ ] Реализовать `/audit`.
- [ ] Реализовать `/observability`.
- [ ] Проверить scope-specific UX для settings.
- [ ] Проверить permission-based nav hiding.

## Phase E: Operations And Intelligence

- [ ] Реализовать `/payments`.
- [ ] Реализовать `/payment-provider-configs`.
- [ ] Реализовать `/payment-reconciliation`.
- [ ] Реализовать `/kitchen`.
- [ ] Реализовать `/order-board`.
- [ ] Реализовать `/owner-cabinet`.
- [ ] Реализовать `/analytics-snapshots`.
- [ ] Проверить payment config secret rotation UX.
- [ ] Проверить analytics read mode UX.

## Phase F: Cleanup And Cutover

- [ ] Удалить legacy admin pages из `src/app/(app)/**`.
- [ ] Удалить `ProtectedShell`.
- [ ] Удалить `ResourceWorkspace`.
- [ ] Удалить legacy flat navigation.
- [ ] Проверить сохранение `/login`.
- [ ] Проверить сохранение `kiosk/[deviceId]`.
- [ ] Прогнать acceptance и regression сценарии.
- [ ] Обновить связанные repo docs при необходимости.

## Parallelization Guidance

- `Main agent`
  Ведет Phase A, архитектуру, layout и provider-layer.
- `Worker 1`
  Берет platform resources.
- `Worker 2`
  Берет catalog resources.
- `Worker 3`
  Берет control + operational custom screens.
- `Main agent`
  Выполняет final integration и legacy removal.

## Blocking Conditions

- [ ] Refine auth flow не совместим с текущим JWT backend.
- [ ] Data provider не может прозрачно работать с `ListResponse<T>`.
- [ ] Нужен backend change для критического admin scenario.
- [ ] Kiosk route ломается из-за app tree refactor.
- [ ] Permission model нельзя выразить через `claims + permissions`.

## Exit Checklist

- [ ] Все admin routes работают на новом shell.
- [ ] Legacy admin shell полностью удален.
- [ ] Kiosk route не затронут.
- [ ] Payment secrets не читаются обратно.
- [ ] `apps/web` проходит `typecheck`.
- [ ] `apps/web` проходит `lint`.
- [ ] `apps/web` проходит `build`.
- [ ] Acceptance plan закрыт.
