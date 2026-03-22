# Acceptance Test Plan

## Verification Gates

Обязательные технические проверки для `apps/web`:

- `typecheck`
- `lint`
- `build`

Миграция не считается завершенной без прохождения всех трех.

## Smoke Scenarios

### Auth

- Пользователь открывает защищенный admin URL без session.
  Expected: redirect на `/login`.
- Пользователь логинится валидными credentials.
  Expected: successful redirect на `/dashboard`.
- Пользователь нажимает logout.
  Expected: session очищена, admin route снова требует login.

### Navigation

- Platform-admin открывает sidebar.
  Expected: видит все nav groups.
- Tenant user открывает sidebar.
  Expected: видит только разрешенные groups/resources.
- Активный route подсвечен корректно.

## CRUD Acceptance

### Platform

- `tenants`
  list, create, edit доступны platform-admin.
- `stores`
  list/filter/create/edit работают.
- `users`
  create/edit поддерживают roleIds/storeIds.
- `roles`
  create/edit использует актуальный список permissions.
- `devices`
  create/edit работают, kiosk token issuance доступен только для kiosk device.
- `onboarding`
  bootstrap успешно создает tenant, store, devices и возвращает bootstrap data.

### Catalog

- `brands`
  create/edit/list работают.
- `categories`
  parent category selector работает.
- `products`
  create/edit/list работают, modifier group linkage доступен.
- `product variants`
  доступны из product context и отдельного route entry.
- `modifier groups`
  create/edit/list работают.
- `modifier options`
  редактируются в контексте выбранной группы.
- `price lists`
  items редактируются без raw JSON хаоса.
- `catalog overrides`
  create/edit/list/filter по store/target работают.

### Control

- `settings`
  tenant/store scopes четко разделены и сохраняются корректно.
- `feature flags`
  upsert flow работает для tenant и store scope.
- `customization`
  branding и rules доступны раздельно.
- `audit`
  list фильтруется, detail payload открывается без потери читаемости.
- `observability`
  status page показывает configured/degraded states.

## Operational Acceptance

### Payments

- Пользователь открывает `/payments`.
  Expected: видит filtered list intents.
- Пользователь открывает intent detail.
  Expected: видит allocations и attempts.
- Пользователь запускает allocation process.
  Expected: action выполняется и UI корректно обновляет status.
- Пользователь отменяет pending intent.
  Expected: cancel flow отрабатывает и UI отражает новый статус.

### Payment Provider Configs

- Пользователь создает config с `settings` и `secrets`.
  Expected: config сохраняется.
- Пользователь снова открывает config.
  Expected: `settings` видны, `secrets` не видны, только metadata о конфигурации.
- Пользователь выполняет rotation через update.
  Expected: секрет обновляется без readback старого payload.

### Kitchen And Board

- `/kitchen` показывает ticket queue.
- Transition action меняет ticket status и UI обновляется.
- `/order-board` показывает orders с board status без admin CRUD framing.

### Intelligence

- `/owner-cabinet`
  поддерживает `LIVE`, `PREFER_SNAPSHOT`, `SNAPSHOT_ONLY`.
- При отсутствии snapshot в `SNAPSHOT_ONLY`
  Expected: понятная ошибка/empty state.
- `/analytics-snapshots`
  list работает.
- `precompute`
  создает новый snapshot и обновляет list.

## Security And Permission Scenarios

- Tenant-scoped user не видит platform-only onboarding.
- Tenant-scoped user не видит tenant data другого tenant.
- Store-scoped user не видит недоступные store actions.
- Пользователь без `payment_configs.write` не видит edit/create actions на
  payment provider configs.
- Payment secrets никогда не читаются обратно из UI после save.
- Direct URL access к запрещенной странице дает forbidden state, а не crash.

## Regression Scenarios

- Текущий backend auth compatibility сохранен.
- Сохранены текущие admin URL:
  - `/dashboard`
  - `/tenants`
  - `/stores`
  - `/devices`
  - `/payments`
  - `/owner-cabinet`
  - и остальные из IA.
- `kiosk/[deviceId]` продолжает работать с `token` query parameter.
- Удаление legacy admin shell не ломает public kiosk route.

## Visual Acceptance

Проверить вручную минимум на:

- `1440px`
- `1280px`
- `1024px`

Expected:

- sidebar не ломает grid;
- header не наезжает на content;
- длинные таблицы остаются usable;
- формы не распадаются на хаотичные столбцы;
- empty, loading и error states оформлены последовательно;
- новые экраны выглядят как единый продукт, а не набор случайных шаблонов.

## Explicit Non-Acceptance States

Следующие состояния считаются провалом миграции:

- legacy admin page еще нужна для части критических сценариев;
- новый shell и старый shell существуют параллельно без четкого cutover;
- payment secrets можно увидеть после сохранения;
- operational screens сделаны как generic JSON CRUD;
- kiosk route получил admin shell;
- permissions проверяются только backend-ом, а UI показывает все подряд.
