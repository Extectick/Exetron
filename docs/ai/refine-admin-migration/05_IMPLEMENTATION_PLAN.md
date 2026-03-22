# Implementation Plan

## Delivery Model

Миграция выполняется по фазам `A-F`. Каждая следующая фаза начинается только
после прохождения definition of done предыдущей.

## Phase A: Foundation

### Scope

- Подключить `Refine` и `Ant Design 5` в `apps/web`.
- Поднять admin root на `App Router`.
- Реализовать:
  - custom `authProvider`
  - custom `dataProvider`
  - custom `accessControlProvider`
  - `Exetron Admin Shell`
  - grouped navigation
  - theme tokens
- Переписать `/login`.

### Deliverables

- Новый admin layout на Refine.
- Единый provider tree.
- Новый sidebar/header shell.
- Новый login screen.
- Базовый route guard.

### Dependencies

- Нет внешних зависимостей, кроме текущего backend auth/API.

### Definition Of Done

- `/login` работает на новом UI.
- Защищенные admin routes редиректят guest пользователя на `/login`.
- После логина пользователь попадает в новый `/dashboard`.
- Sidebar grouped и фильтруется по permissions.
- `apps/web` проходит `typecheck`, `lint`, `build`.

## Phase B: Platform

### Scope

- `onboarding`
- `tenants`
- `stores`
- `users`
- `roles`
- `devices`

### Deliverables

- CRUD/operational parity для platform resource-ов.
- Kiosk token issuance из `devices`.
- Guided onboarding flow с результатом bootstrap secrets и kiosk tokens.

### Dependencies

- Завершенная Phase A.

### Definition Of Done

- Platform-admin может пройти полный bootstrap через `/onboarding`.
- CRUD для `tenants`, `stores`, `users`, `roles`, `devices` рабочий.
- `roles` используют `/permissions` как источник выбора прав.
- В `devices` работает kiosk token issuance.

## Phase C: Catalog

### Scope

- `brands`
- `categories`
- `products`
- `product variants`
- `modifier groups`
- `modifier options`
- `price lists`
- `catalog overrides`

### Deliverables

- Полный catalog management на новом UI.
- Child-resource flows для variants и options.
- Price list/item editing без raw generic editor.

### Dependencies

- Завершенная Phase B.

### Definition Of Done

- Tenant admin может вести каталог без legacy screen-ов.
- Parent-child flows не требуют ручного ввода id.
- Filters, sorting и edit flows работают на всех catalog pages.

## Phase D: Control

### Scope

- `settings`
- `feature flags`
- `customization`
- `audit`
- `observability`

### Deliverables

- Scoped settings workspace.
- Feature flags upsert UX.
- Split customization workspace.
- Audit list/detail.
- Observability status screen.

### Dependencies

- Завершенные Phase A-C.

### Definition Of Done

- Tenant/store settings удобно редактируются по scope.
- Feature flags не выглядят как сырое key/value API.
- Customization разделен на branding и rules.
- Observability показывает external wiring status без raw infra clutter.

## Phase E: Operations And Intelligence

### Scope

- `payments`
- `payment provider configs`
- `payment reconciliation`
- `kitchen`
- `order board`
- `owner cabinet`
- `analytics snapshots`

### Deliverables

- Полный operational слой на новом shell.
- Payment config secret rotation.
- Owner cabinet mode selection.
- Analytics precompute trigger.

### Dependencies

- Завершенные Phase A-D.

### Definition Of Done

- Payment operator может просматривать intent-ы, attempts и выполнять actions.
- Payment secrets не отображаются после save.
- Kitchen и order board usable как operational screens.
- Owner cabinet и analytics snapshots работают без legacy page-ов.

## Phase F: Cleanup And Cutover

### Scope

- Удаление legacy admin pages.
- Удаление legacy shell/components/navigation.
- Route parity verification.
- Docs refresh.
- Visual polish.
- Regression hardening.

### Deliverables

- Удаленные legacy admin files.
- Чистый `apps/web` без dual-admin архитектуры.
- Обновленные repo docs при необходимости.

### Dependencies

- Завершенные Phase A-E.

### Definition Of Done

- `src/app/(app)/**` legacy admin pages удалены.
- `ProtectedShell`, `ResourceWorkspace`, legacy nav удалены.
- Сохранились `/login` и `kiosk/[deviceId]`.
- Все preserved URLs работают на новом UI.
- Пройдены acceptance и regression сценарии.

## Sequencing Rules

- Не переносить catalog и operational pages до завершения foundation.
- Не удалять legacy routes до достижения parity.
- Не смешивать large-scale visual polish с foundation migration.
- Не вносить backend breaking changes в рамках frontend phase без отдельного
  explicit follow-up.

## Suggested Agent Split

- `Main agent`
  Foundation, architecture, route tree, providers, theme, shell.
- `Worker 1`
  Platform resources.
- `Worker 2`
  Catalog resources.
- `Worker 3`
  Control and operational custom pages.
- `Main agent`
  Final integration, legacy removal, regression reconciliation.

## Risk Register

- `Auth drift`
  Refine auth flow может разойтись с текущим JWT backend.
  Mitigation: authProvider реализуется строго поверх текущих endpoint-ов.
- `CRUD over-generalization`
  Попытка посадить operational pages на generic scaffolding ухудшит UX.
  Mitigation: заранее зафиксированы custom screens.
- `Scope leakage`
  UI может показать лишние действия tenant/store users.
  Mitigation: accessControlProvider + nav filtering + forbidden states.
- `Legacy coexistence drag`
  Долгое совместное существование старой и новой админки размоет миграцию.
  Mitigation: жесткая Phase F с полным удалением legacy shell.
