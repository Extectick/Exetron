# Progress Tracker Part 2
## Статус post-baseline roadmap

## Current Phase
- Current Phase: `PHASE 16`

## Current Iteration Goal
- Current Iteration Goal: `Начать PHASE 16: provider/fiscal/device integration layer поверх stabilized payments + customer growth foundation`

## Overall Progress
- [x] Phase 0
- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [x] Phase 5
- [x] Phase 6
- [x] Phase 7
- [x] Phase 8
- [x] Phase 9
- [x] Phase 10
- [x] Phase 11
- [x] Phase 12
- [x] Phase 13
- [x] Phase 14
- [x] Phase 15
- [ ] Phase 16
- [ ] Phase 17
- [ ] Phase 18
- [ ] Phase 19
- [ ] Phase 20

## Done
- Baseline `PHASE 0 -> PHASE 10` завершен
- Есть рабочий multi-tenant backend и channel runtimes для POS, kiosk, kitchen and owner cabinet
- Зафиксирован стратегический roadmap для post-baseline развития
- Подготовлен AI execution pack `реализация_часть_2` для фаз `11 -> 20`
- PHASE 11 начат: kiosk public access переведен с raw `deviceId` на signed kiosk access token
- Проверки для kiosk hardening deliverable пройдены: API `typecheck`, Web `typecheck`, e2e `phase11-kiosk-hardening`, `phase6-kiosk`, `phase9-customization`
- PHASE 11: добавлен platform-admin onboarding runtime `POST /onboarding/bootstrap` для создания `tenant -> first store -> initial devices`
- Onboarding bootstrap возвращает one-shot device bootstrap secrets и может сразу выдать kiosk access token для новых kiosk devices
- Проверки для onboarding deliverable пройдены: API `typecheck`, e2e `phase11-onboarding`, regression e2e `phase11-kiosk-hardening`, `phase1-live`
- PHASE 11: payment provider configs отделяют public `settings` от sensitive `secrets`, хранят секреты в encrypted envelope и возвращают только redacted metadata
- Для provider secret boundary добавлен `ADR-030`
- Проверки для provider secret deliverable пройдены: API `typecheck`, Web `typecheck`, e2e `phase11-provider-secrets`, regression e2e `phase7-payments`
- PHASE 11: owner analytics получили precompute runtime `POST /analytics/precompute`, snapshot-aware read modes и explicit artifact boundary
- Для analytics precompute добавлен `ADR-031`
- PHASE 11: observability получила exporter env contract, status endpoint `GET /health/observability` и exporter gauges в metrics
- Для observability boundary добавлен `ADR-032`
- PHASE 11 полностью завершен: regression e2e пройдены для `phase1-live`, `phase7-payments`, `phase8-analytics`, всех новых `phase11-*` сценариев
- PHASE 12 завершен: добавлен centralized `localization` runtime на базе existing settings storage без новых schema forks
- PHASE 12: tenant/store localization preferences, country profiles, localized content, localized templates и language-pack import/export получили typed API contracts и thin admin page `/localization`
- PHASE 12: compiled catalog теперь использует locale resolution policy, localized content overlays и возвращает localization metadata с `locale`, `countryCode`, `currency` и `tax`
- PHASE 12: добавлены synchronized template rendering, country compliance flags и formatting previews для money/date/address/phone
- Для localization registry и locale precedence добавлены `ADR-033` и `ADR-034`
- Проверки для PHASE 12 пройдены: API `typecheck`, Web `typecheck`, e2e `phase12-localization`, regression e2e `phase2-catalog`, `phase6-kiosk`
- PHASE 13 завершен: добавлен public `storefront` runtime с bootstrap, guest/customer sessions, carts, checkout, QR ordering links и signed tracking access
- PHASE 13: online commerce переиспользует existing commerce core и канал `DELIVERY`, без отдельного storefront-only order lifecycle
- PHASE 13: customer status updates и notification queue artifacts пишутся в `OrderEvent` и outbox-backed domain events как `storefront.status_hook_emitted` и `storefront.notification_queued`
- PHASE 13: добавлены public web pages `/storefront/[storeCode]` и `/order-tracking/[orderId]`
- Для storefront runtime boundary и public token/event model добавлены `ADR-035` и `ADR-036`
- Проверки для PHASE 13 пройдены: API `typecheck`, Web `typecheck`, e2e `phase13-storefront`, regression e2e `phase3-orders`, `phase6-kiosk`, `phase7-payments`
- PHASE 14 завершен: добавлен `fulfillment` runtime с store config, delivery zones/fees, pickup/dine-in selection, dispatch board и operator update APIs
- PHASE 14: cart/order totals теперь учитывают `fulfillmentFee`, а cart/order DTO несут fulfillment snapshot с `mode`, `status`, payload, promised time и ETA
- PHASE 14: storefront теперь требует fulfillment selection до checkout и показывает delivery/pickup/dine-in state в tracking
- PHASE 14: courier assignment, ETA updates и fulfillment status changes пишутся в `OrderEvent`/outbox и могут ставить customer notification queue artifacts
- Для fulfillment snapshot model и settings-backed fulfillment config добавлены `ADR-037` и `ADR-038`
- Проверки для PHASE 14 пройдены: database `db:deploy`, API `typecheck`, Web `typecheck`, unit `order-money.util`, e2e `phase14-fulfillment`, regression e2e `phase13-storefront`, `phase3-orders`, `phase6-kiosk`, `phase7-payments`
- PHASE 15 завершен: добавлен `customers` runtime с `CustomerProfile`, `LoyaltyAccount`, `LoyaltyLedgerEntry`, `PromotionCampaign` и новым permission boundary `customers.read/write`
- PHASE 15: carts/orders получили `customerProfileId`, `discountTotal`, `promotionCode`, `promotionSnapshot`, а cart mutation paths теперь сбрасывают applied promo при изменении pricing-affecting state
- PHASE 15: storefront получил customer growth summary в bootstrap, promo apply path, repeat-order flow и post-checkout profile/loyalty finalization
- PHASE 15: segmentation и retention hooks пишутся как `customer.*` order events и outbox-backed domain events, без выделения отдельного campaign worker в этой фазе
- PHASE 15: добавлена thin admin page `/customers`, promotion management surface и manual loyalty adjustment flow
- Для customer identity boundary и promo snapshot policy добавлены `ADR-039` и `ADR-040`
- Проверки для PHASE 15 пройдены: database `db:generate`, `build`, `db:deploy`, contracts `typecheck`, API `typecheck`, Web `typecheck`, unit `order-money.util`, e2e `phase15-customers`, regression e2e `phase13-storefront`, `phase14-fulfillment`, `phase7-payments`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Начать `PHASE 16`
- Расширить payments runtime до provider/fiscal/printer/webhook/device contract layer без разрушения `PHASE 15` promo/loyalty snapshot semantics
- Сохранить promotions/loyalty как cart-order concern и не переносить их в provider-specific state machines

## Decisions
- Реализация идет в порядке `PHASE 11 -> PHASE 20`
- Этот tracker отражает только фактический статус post-baseline очереди
- Новые стратегические cross-cutting решения для `PHASE 11 -> PHASE 20` фиксируются новыми ADR начиная с `ADR-026`
- Kiosk public runtime теперь защищен signed kiosk access token, который выдается только из authenticated device API и проверяется на `bootstrap`/`checkout`
- Tenant/store/device onboarding для текущей волны зафиксирован как platform-admin bootstrap API, а не как отдельный self-serve billing/org flow
- Provider config secrets для текущей волны отделены от public settings, записываются как write-only encrypted envelope и не читаются обратно через CRUD API
- Analytics precompute для текущей волны переиспользует `AnalyticsSnapshot` как artifact contract и остается inline-now with async-ready events
- External observability для текущей волны зафиксирована как runtime/env boundary и status surface, а не как полный collector rollout
- Localization registry для текущей волны переиспользует existing settings storage и не вводит отдельные таблицы до появления доказанной post-PHASE-12 write pressure
- Locale resolution и country policy для текущей волны централизованы в одном localization service с deterministic precedence order и compiled catalog metadata
- Public storefront для текущей волны переиспользует existing commerce core и канал `DELIVERY`, а не вводит отдельный storefront-only order domain
- Public storefront access построен на signed public tokens для carts, customer sessions, QR entry links и tracking, а customer updates фиксируются как event artifacts до появления real delivery providers
- Fulfillment для текущей волны расширяет existing cart/order model snapshot-полями и `OrderEvent`, а не создает отдельный fulfillment aggregate/table-per-subdomain design
- Store fulfillment config для текущей волны хранится в settings-backed registry и остается manual/event-driven до реальных provider integrations
- Customer growth для текущей волны отделен от staff identity: `CustomerProfile` tenant-scoped, keyed by normalized phone, а loyalty живет в account+ledger модели
- Promotions для текущей волны materialize как explicit cart/order discount snapshot; любые pricing-affecting cart mutations сбрасывают applied promo вместо hidden recompute magic

## Tech Debt
- для kiosk access token пока нет dedicated rotation UI; выдача идет через API endpoint
- device bootstrap secret теперь возвращается в onboarding response только один раз; отдельный rotate/reissue flow еще не реализован
- payment provider secrets пока шифруются application-level ключом из текущего API secret set; managed secret manager и независимая key rotation еще не внедрены
- kiosk public runtime пока не имеет rate limiting для token-backed public traffic
- observability export пока остается boundary/status-only without full external collector rollout
- localization пока хранится поверх settings registry; dedicated translation tables и async sync pipeline еще не выделены
- tax layer в PHASE 12 пока описывает country policy metadata и formatting context, но не меняет checkout math
- existing web surfaces кроме `/localization` еще не переведены на собственный UI copy i18n runtime
- storefront customer identity пока session-token based и не превращается в полноценный CRM/customer profile domain до `PHASE 15`
- storefront notifications пока существуют как queued event artifacts и tracking payloads; реальный outbound dispatcher/provider layer еще не реализован
- storefront public traffic пока не имеет dedicated rate-limiting/abuse controls beyond signed token boundary
- fulfillment config пока хранится как settings-backed JSON; dedicated zone/table/provider tables еще не выделены
- fulfillment status layer пока не синхронизирован с отдельным courier mobile app или external dispatch provider
- storefront still uses channel `DELIVERY` even for pickup/dine-in fulfillment modes; dedicated channel split пока осознанно отложен
- customer profile identity пока нормализована только вокруг phone-based ownership; explicit merge workflows и consent ledger еще не реализованы
- promotion eligibility пока intentionally lightweight: segment keys, min order total and loyalty points cost without full rule engine precedence over customization
- retention hooks пока event artifacts and recommended template keys only; отдельный campaign scheduler/dispatcher еще не внедрен
- payments runtime пока симулирует providers
- analytics precompute пока выполняется inline в API процессе; отдельный queue/worker orchestration еще не выделен
- billing, inventory and enterprise layers пока отсутствуют как полноценные домены

## Cross-Phase Risks
- риск смешения scope между adjacent phases, особенно `13/14/15/16`
- риск tenant-specific hacks при country, billing or enterprise work
- риск преждевременной детализации UI без domain and API contracts
- риск silent architecture drift без ADR discipline
- риск перегрузить одну фазу задачами следующей волны
- риск перепутать текущий platform-admin onboarding bootstrap с будущим self-onboarding из monetization/billing waves
- риск принять temporary encrypted envelope за финальную замену external secret management
- риск расширить PHASE 12 localization templates до storefront notifications и customer messaging раньше PHASE 13/15
- риск начать решать country-specific commerce behavior вне централизованного country policy layer
- риск перетащить delivery/pickup/dine-in fulfillment логику из `PHASE 14` прямо в базовый storefront contract `PHASE 13`
- риск принять session-token customer model за финальную customer identity модель до `PHASE 15`
- риск разрастить текущий fulfillment snapshot до полноценного CRM or fleet-management domain раньше нужной фазы
- риск превратить settings-backed fulfillment config в permanent storage shape без пересмотра под provider/inventory pressure
- риск разрастания `customers` runtime в полноценный CDP/marketing suite раньше enterprise/billing/ecosystem phases
- риск переноса promo or loyalty invariants в provider-specific payment/fiscal logic при реализации `PHASE 16`

## Completed Work Summary
- `PHASE 0`: foundation, architecture, monorepo, environment setup
- `PHASE 1`: auth, tenants, stores, users, roles, permissions, devices, audit, settings, feature flags
- `PHASE 2`: catalog, modifiers, pricing, overrides, compiled catalog
- `PHASE 3`: carts, checkout, orders, lifecycle, events
- `PHASE 4`: POS runtime, shifts, POS sessions, offline-lite queue
- `PHASE 5`: kitchen tickets, order board, realtime feed
- `PHASE 6`: kiosk runtime and branded self-service flow
- `PHASE 7`: payments abstraction and reconciliation basics
- `PHASE 8`: owner analytics and cabinet
- `PHASE 9`: customization layer, branding configs, rules executor
- `PHASE 10`: hardening, structured logs, request ids, readiness, metrics, CI/CD gates
- `PHASE 11`: product maturity, onboarding bootstrap, kiosk hardening, secrets boundary, observability, analytics precompute
- `PHASE 12`: localization service, locale precedence, country profiles, localized catalog content, language packs, localized template foundation
- `PHASE 13`: public storefront, guest/customer online checkout, QR ordering links, tracking tokens, and notification event hooks
- `PHASE 14`: delivery zones and fees, pickup/dine-in selection, dispatch board, courier/ETA updates, and fulfillment status tracking
- `PHASE 15`: customer profiles, loyalty balances/ledger, promotion campaigns, customer segment/retention hooks, and storefront repeat-order flow
