# Technical Architecture

## Stack

- `Next.js 15` with `App Router`
- `React 19`
- `Refine`
  - `@refinedev/core`
  - `@refinedev/nextjs-router`
  - `@refinedev/antd`
- `Ant Design 5`
- Existing `@exetron/contracts`
- Existing backend REST API

В этой миграции не используется отдельный admin app и не внедряется
`Ant Design Pro` как отдельный дополнительный framework layer.

## Frontend Structure

Целевая структура `apps/web/src`:

```text
app/
  (admin)/
    layout.tsx
    dashboard/page.tsx
    onboarding/page.tsx
    tenants/page.tsx
    ...
  login/page.tsx
  kiosk/[deviceId]/page.tsx
components/
  admin-shell/
  admin-common/
refine/
  app/
  config/
  layout/
  providers/
  resources/
  theme/
lib/
  http/
  domain/
```

## Refine Root

В admin root layout нужно поднять единый `Refine` provider tree:

- `routerProvider` через `@refinedev/nextjs-router`
- `dataProvider` кастомный
- `authProvider` кастомный
- `accessControlProvider` кастомный
- `notificationProvider`
- `resources` registry

Admin root должен быть client boundary. Основа admin UI в этой миграции
реализуется client-side, потому что текущий auth хранится в `localStorage`.

## Resource Registry

`resources` регистрируются централизованно в одном конфиге, а не размазываются
по страницам.

Каждый resource получает:

- `name`
- `list`
- при необходимости `create`
- при необходимости `edit`
- `meta`
  - navigation group
  - label
  - required permission
  - parent resource, если применимо

`meta` используется для построения grouped sidebar и resource-aware shell.

## Auth Provider

Новый `authProvider` обязан работать поверх существующих endpoint-ов:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### Rules

- Session хранится client-side.
- Storage ключ может измениться относительно legacy shell, но новая схема
  хранения должна быть изолирована от старой и явно названа.
- `login`:
  - вызывает `/auth/login`
  - затем `/auth/me`
  - сохраняет `accessToken`, `refreshToken`, `me`
- `check`:
  - пытается восстановить session из storage
  - валидирует ее через `/auth/me`
  - на failure очищает session и переводит в guest state
- `getIdentity`:
  - возвращает user profile и claims из сохраненного `me`
- `logout`:
  - best-effort вызывает `/auth/logout`
  - очищает local session независимо от ответа backend

### Explicit Decision

На этой миграции не внедрять silent refresh и не перестраивать auth semantics.
UI должен быть совместим с текущим JWT backend как есть.

## Access Control Provider

Источник прав:

- `claims.scope`
- `claims.tenantId`
- `claims.storeIds`
- `permissions[]` из `/auth/me`

### Rules

- `platform_admin` видит все nav groups и actions.
- Tenant users видят только ресурсы, для которых у них есть permission.
- Store-scoped ограничения решаются в двух слоях:
  - скрытие недоступных UI actions;
  - фактическое ограничение backend-ответами и filters.

### Required Behavior

- Sidebar скрывает недоступные ресурсы.
- Action buttons скрываются или disabled с понятной причиной.
- Direct URL access на запрещенную страницу дает понятный forbidden state, а не
  silent crash.

## Data Provider

Нужен один кастомный `dataProvider`, адаптированный под текущий backend.

### Supported Standard Methods

- `getList`
- `getOne`
- `create`
- `update`

`deleteOne` не считается обязательным baseline, потому что backend сейчас не
строится вокруг массовых delete flows.

### Mapping Rules

- List endpoints читают `ListResponse<T>` и возвращают:
  - `data`
  - `total`
- Create/update используют существующие `POST`, `PATCH`, `PUT`, в зависимости от
  конкретного ресурса.
- Для нестандартных ресурсов разрешены `custom` domain clients рядом с
  `dataProvider`, а не перегрузка стандартных методов до нечитаемого состояния.

### HTTP Client

Базовый HTTP client выделяется отдельно и отвечает за:

- base URL
- JSON serialization
- auth header
- standardized error translation

Domain clients строятся поверх него для:

- onboarding
- analytics precompute
- payment allocation processing
- payment intent cancellation
- kiosk token issuance
- observability

## Layout Model

Используется кастомный `Exetron Admin Shell`, а не stock `ThemedLayout`.

Shell обязан включать:

- grouped sidebar
- header
- breadcrumb area
- page action zone
- content container с predictable spacing

## Theme Model

### Direction

- light-first
- warm neutrals
- graphite text
- strong accent color

### Locked Theme Intent

- base background: теплый светлый нейтрал
- containers: почти white
- primary accent: теплый янтарно-терракотовый, не стандартный Ant blue
- critical actions: чистый semantic red
- success states: приглушенный green

### Typography

- Основной UI font: выразительный sans-serif, не дефолтный system-only look.
- Monospace font для ids, tokens, technical fields.

## State And Data Fetching

- Для admin screens использовать Refine hooks и их query model.
- Не строить второй параллельный state layer для тех же данных.
- Server Components не использовать как основную модель загрузки admin data в
  первой миграции.
- Heavy custom screens могут иметь локальный client state, но backend data
  source остается единым.

## Route Model

- Все admin routes живут в `app/(admin)`.
- Публичные URL сохраняются без префикса.
- `/login` живет вне `(admin)`.
- `kiosk/[deviceId]` живет вне `(admin)` и вне Refine tree.

## Screen Strategy

### Standard Refine CRUD

Использовать там, где backend route shape уже близок к list/create/edit модели.

### Hybrid Resource Screens

Использовать там, где нужен CRUD плюс доменная логика:

- settings
- payment provider configs
- product variants
- modifier options

### Fully Custom Screens

Использовать там, где сценарий operational, orchestration или analytics-driven:

- dashboard
- onboarding
- payments
- payment reconciliation
- kitchen
- order board
- owner cabinet
- analytics snapshots
- observability

## Legacy Removal Strategy

Legacy admin слой подлежит удалению:

- все admin pages в `src/app/(app)/**`
- `ProtectedShell`
- `ResourceWorkspace`
- flat navigation config

### Removal Rule

Удалять legacy код только после того, как новый screen достигает parity по:

- route
- primary actions
- permissions
- regression checks

## Explicit Keep List

Следующие части не удаляются:

- `src/app/login/page.tsx`
  Переписать, но route сохранить.
- `src/app/kiosk/[deviceId]/page.tsx`
  Сохранить отдельно от admin shell.
- Базовый API клиент
  Переписать в provider/domain shape, но не уничтожать typed contract layer.

## Backend Compatibility Rules

- Не менять backend endpoint-ы только ради красивой frontend abstraction.
- Если UI обнаруживает неудобный API gap, он фиксируется в отдельном backlog.
- Migration не должна ломать текущие auth, kiosk, payments и analytics contracts.

## Done Condition

Техническая миграция считается завершенной, когда:

- admin shell работает на Refine;
- все admin routes переехали;
- legacy shell удален;
- kiosk route жив отдельно;
- `apps/web` проходит `typecheck`, `lint`, `build`;
- приняты сценарии из acceptance plan.
