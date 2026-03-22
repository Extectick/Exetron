# Product Requirements

## Goal

Построить удобную, функциональную и visually coherent админку `Exetron`,
которая полностью заменяет текущий admin UI и становится постоянным рабочим
инструментом для platform-admin и tenant/staff операторов.

## Success Criteria

- Админка покрывает весь текущий backend scope `PHASE 0-11`, кроме public kiosk.
- Пользователь может выполнять основные административные задачи без ручной
  работы с сырыми JSON-полями, кроме доменов, где JSON является частью
  контрактной модели.
- Навигация grouped и масштабируется на дальнейшие product phases.
- Операционные страницы читаются быстро и не выглядят как набор
  прототипных CRUD-форм.
- Секреты платежных провайдеров безопасно редактируются как write-only данные.
- Tenant-scoped и store-scoped пользователи видят только доступные действия.

## Primary Users

- `Platform Admin`
  Управляет tenant bootstrap, stores, users, devices, глобальными настройками,
  observability и cross-tenant операциями.
- `Tenant Admin`
  Управляет своим tenant, каталогом, staff, настройками, branding, feature
  flags, devices и analytics.
- `Store Operator`
  Работает с payments, kitchen, order board, devices и store-scoped runtime
  настройками в рамках доступных store.

## UX Principles

- `Density first`
  Основные экраны data-heavy, без избыточных отступов и пустого воздуха.
- `Filter first`
  Любой list screen начинается с usable filters, а не с бесконечной таблицы.
- `Safe operations`
  Разрушительные и чувствительные действия подтверждаются и четко маркируются.
- `Clarity over cleverness`
  Админка должна быть понятной оператору без обучения по внутренней кухне.
- `One obvious way`
  Для каждого resource screen есть один основной путь создания, редактирования,
  поиска и просмотра статуса.
- `Light-first enterprise`
  Базовый режим светлый, деловой и контрастный, без визуального шума.

## Functional Requirements

### Platform

- Должны быть полноценные экраны для:
  - `dashboard`
  - `onboarding`
  - `tenants`
  - `stores`
  - `users`
  - `roles`
  - `devices`
- Для `devices` нужен быстрый выпуск kiosk access token без перехода в сырые API.
- Для `onboarding` нужен guided flow, а не общий CRUD editor.

### Catalog

- Должны быть отдельные удобные экраны для:
  - `brands`
  - `categories`
  - `products`
  - `product variants`
  - `modifier groups`
  - `modifier options`
  - `price lists`
  - `catalog overrides`
- Каталожные формы должны быть domain-shaped:
  - boolean flags в виде switches;
  - money в виде явных decimal inputs;
  - связи выбираются через selects, а не через ручной ввод id;
  - вложенные сущности должны редактироваться через child views, drawers или
    inline sections, а не через одну общую текстовую форму.

### Operations

- Должны быть отдельные экраны для:
  - `payments`
  - `payment provider configs`
  - `payment reconciliation`
  - `kitchen`
  - `order board`
- `payments` должен поддерживать list -> detail drilldown -> attempts -> actions.
- `payment provider configs` должен скрывать secret payload после сохранения.
- `kitchen` и `order board` должны оставаться operational screens, а не
  имитацией CRUD.

### Intelligence

- Должны быть отдельные экраны для:
  - `owner cabinet`
  - `analytics snapshots`
- `owner cabinet` должен поддерживать mode selection:
  - `LIVE`
  - `PREFER_SNAPSHOT`
  - `SNAPSHOT_ONLY`
- `analytics snapshots` должен позволять запускать `precompute`.

### Control

- Должны быть отдельные экраны для:
  - `settings`
  - `feature flags`
  - `customization`
  - `audit`
  - `observability`
- `settings` должны быть разделены на tenant/store scopes.
- `customization` должен быть разделен минимум на branding и rules.
- `observability` должен показывать внешнее состояние probes/export wiring без
  технического шума.

## Navigation Requirements

- Боковая навигация должна быть grouped по доменам.
- Внутри группы порядок фиксирован документацией и не определяется
  алфавитом.
- Текущий URL должен сохранять активное состояние navigation item.
- Навигация должна уметь скрывать недоступные разделы на основе permissions.

## Header Requirements

В верхней панели обязательно показывать:

- имя и email текущего пользователя;
- текущий scope:
  - `Platform Admin`
  - `Tenant User`
  - `Store-scoped User`;
- context chips для `tenant` и `store`, если scope их ограничивает;
- placeholder для future global search / quick actions;
- logout action.

## Form Requirements

- Все формы должны иметь:
  - явные labels;
  - predictable validation;
  - inline error messages;
  - save/cancel actions в постоянной зоне видимости;
  - успешные и ошибочные notifications.
- JSON-редакторы разрешены только там, где backend контракт реально ожидает
  `Record<string, unknown>`, и вокруг них должно быть пояснение по shape данных.

## List Requirements

- Все list screens по умолчанию поддерживают:
  - server-side pagination;
  - sorting;
  - filtering;
  - empty state;
  - error state;
  - row actions;
  - detail/edit navigation.
- Bulk destructive actions не включаются без явной необходимости.

## Security Requirements

- Админка не должна повторно показывать payment secrets после сохранения.
- Пользователь не должен видеть разделы и действия вне своих permissions.
- Tenant-scoped и store-scoped ограничения должны уважаться даже при наличии
  URL-прямого доступа.
- Public kiosk flow не должен случайно получить admin chrome или admin state.

## Visual Requirements

- Базовый стек: `Refine + Ant Design 5 + custom Exetron shell`.
- Не использовать визуально дефолтный `Ant blue` как основной бренд-акцент.
- Не использовать dark mode в первой миграции как primary target.
- Использовать деловую, контрастную и аккуратную light palette.
- Основная типографика должна быть чуть выразительнее стандартного
  system-only вида.

## Out Of Scope

- Отдельное мобильное admin experience.
- Full-text global search c backend индексом.
- Refine migration для public kiosk.
- Realtime dashboards beyond already existing backend capabilities.
- Additional backend product work, кроме строго необходимых UI follow-ups,
  вынесенных в backlog.
