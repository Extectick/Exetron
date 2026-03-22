# Progress Tracker Part 2
## Статус post-baseline roadmap

## Current Phase
- Current Phase: `PHASE 20`

## Current Iteration Goal
- Current Iteration Goal: `Post-roadmap stabilization: harden persistence/docs for PHASE 16 -> PHASE 20 without changing phase boundaries`

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
- [x] Phase 16
- [x] Phase 17
- [x] Phase 18
- [x] Phase 19
- [x] Phase 20

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
- PHASE 16 завершен: payments runtime получил provider-neutral adapter execution, webhook inbox/idempotency path, refund/void operations, settlement import, connector execution log и hardware job/receipt surfaces
- PHASE 16: добавлены admin page `/integrations`, public webhook endpoint `POST /payments/webhooks/:providerKey`, phase e2e `phase16-integrations` и regression e2e `phase7-payments`
- PHASE 17 завершен: billing foundation переведен с `TenantSetting.billing.state` на dedicated billing tables (`BillingPlan`, `BillingAccount`, `Subscription`, `Invoice`, `EntitlementGrant`, `QuotaCounter`, `TrialGrant`, `ResellerAccount`) с runtime bootstrap до отдельной migration wave
- PHASE 17: onboarding bootstrap теперь автоматически создает starter billing account/subscription/trial для нового tenant, добавлена thin admin page `/billing`, permissions `billing.read/write` и e2e `phase17-billing`
- PHASE 18 завершен: inventory foundation введен как isolated inventory runtime с warehouse/ingredient/item/BOM/receiving/adjustment/reservation/ledger/stop-list surfaces и admin page `/inventory`
- PHASE 18: order checkout теперь делает stock reservation when inventory/BOM configured, cancellation releases reservations, completion consumes them, а phase e2e `phase18-inventory` и regression e2e `phase13-storefront`, `phase14-fulfillment`, `phase15-customers` остаются зелеными
- PHASE 18 hardening: reservation planning/release/consume semantics централизованы в `InventoryService`; `OrdersModule` больше не ходит напрямую в `inventory_*` tables
- PHASE 18 hardening: inventory module переведен на Prisma-backed access поверх mapped phase18 tables; raw SQL остался только как runtime bootstrap для отсутствующих migrations
- PHASE 18 supplier runtime углублен: connector manifest теперь поддерживает transport-aware supplier execution (`SIMULATED|WEBHOOK|FILE_IMPORT`), handoff учитывает delivery mode, а normalized supplier callbacks/import reconciliation идут через `POST /inventory/replenishment-jobs/:id/supplier-webhook` и `POST /inventory/replenishment-jobs/:id/supplier-import` с записью в shared `ConnectorExecutionLog`
- PHASE 19 завершен: organizations foundation добавляет orgs, memberships, tenant links, governance policies, rollout templates, white-label packs и partner accounts с thin admin page `/organizations`
- PHASE 19 hardening: organizations foundation переведен с in-memory assumptions на persistent org tables/Prisma-backed runtime without breaking tenant isolation
- PHASE 20 завершен: enterprise foundation добавляет identity provider, federated link, audit export, secret registry, deployment variant, partner/integration registry and connector template surfaces с thin admin page `/enterprise`
- PHASE 20 hardening: enterprise foundation переведен на persistent runtime tables/Prisma-backed artifacts и получил explicit endpoints для advanced role policies, compliance packs/evidence и partner SDK contracts
- PHASE 20 distribution governance усилен: partner grants теперь поддерживают `grantedConsumerKey`, `grantExpiresAt`, `revokedAt`, public partner fetch path реально блокирует expired/bound grants, а operator runtime получил `governance-readiness`, single apply и batch governance sweep для distribution requests
- PHASE 20 operator workspace доведен до governance loop: `/enterprise` показывает grant expiry/consumer binding и умеет запускать `Approve 30d`, `Apply Governance` и `Sweep Expired Grants`
- PHASE 16 -> PHASE 20 migration consolidation завершена: forward-only Prisma migration `20260319203427_phase16_20_storage_consolidation` регистрирует payment/billing/inventory/organizations/enterprise tables и tenant-scoped RLS policies
- PHASE 16 -> PHASE 20 cleanup завершен: runtime `CREATE TABLE` bootstrap удален из payments/billing/inventory/organizations/enterprise modules; storage baseline теперь migration-first
- PHASE 16 -> PHASE 20 deploy discipline закреплен: root/api dev scripts и `@exetron/api test:e2e` теперь автоматически выполняют `db:deploy`, а `PrismaService` fail-fast проверяет, что последняя migration действительно применена до app startup
- Для runtime/storage boundary фаз `16 -> 20` добавлен `ADR-041`
- Для migration catch-up и storage baseline фаз `16 -> 20` добавлен `ADR-046`
- Для transport-aware supplier callbacks/import reconciliation добавлен `ADR-060`
- Для migration-first runtime baseline после cleanup добавлен `ADR-047`
- Для enforced migration-first startup discipline добавлен `ADR-048`
- Для time-bound partner distribution grants и auto-revoke governance добавлен `ADR-059`
- Проверки для PHASE 16 -> PHASE 20 пройдены: API `typecheck`, Web `typecheck`, e2e `phase16-integrations`, `phase17-billing`, `phase18-inventory`, `phase19-organizations`, `phase20-enterprise`, regression e2e `phase11-onboarding`, `phase7-payments`, `phase13-storefront`, `phase14-fulfillment`, `phase15-customers`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Post-roadmap stabilization: UX/polish waves поверх уже normalized `PHASE 18/19/20` surfaces, без возврата к schema rescue work
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
- PHASE 16 -> PHASE 20 шли contract-first: phase-local runtime bootstrap использовался как промежуточный шаг, но теперь удален после migration consolidation; storage baseline стал migration-first

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
- app startup для PHASE 16 -> PHASE 20 больше не создает таблицы сам; safety теперь зависит от migration-first discipline и runtime guard against stale `_prisma_migrations`
- PHASE 18 inventory storage уже физически переведен на UUID-backed columns и database-level FKs поверх `inventory_*` tables; schema rescue закрыт, а web `/inventory` уже переведен с thin admin page на task-oriented operator workspace
- post-roadmap reporting wave: `inventory` получил endpoint `GET /inventory/operations-overview` с KPI/status/latest snapshot по stock, receiving, reservations, stop-list и ledger; `/inventory` использует его для operational health cards вместо только list-derived summaries
- inventory reporting depth расширен дальше: добавлены `GET /inventory/replenishment-report` и `GET /inventory/ledger-drilldown`, а `/inventory` теперь показывает replenishment recommendations, latest movement drill-down и report-style artifacts для low-stock/operator work
- PHASE 19/20 operator surfaces покрывают list/detail/update/archive/status flows и больше не завязаны на generic console-style pages: `/organizations` и `/enterprise` переведены на purpose-built operator workspaces для org governance и enterprise operations
- post-roadmap reporting wave: `organizations` получил org-scoped overview snapshot с coverage/status/latest artifacts, а `enterprise` получил operations overview для billing, identity, security, compliance и ecosystem surfaces; web pages используют эти snapshots вместо вычисления здоровья только из list endpoints
- verification after Docker-backed local DB restore: targeted e2e `phase19-organizations` и `phase20-enterprise` снова зеленые уже вместе с overview/reporting additions
- targeted verification подтверждена и для `inventory`: `phase18-inventory` проходит вместе с новым operations overview snapshot
- targeted verification подтверждена и для inventory reporting depth: `phase18-inventory` проходит вместе с replenishment report и ledger drill-down
- inventory replenishment/reporting wave доведена до persisted artifacts: добавлены `InventoryReplenishmentJob`, migration `20260321093000_phase18_replenishment_jobs`, CRUD-lite endpoints для generated replenishment batches и UI surface для сохранения/history/archive replenishment jobs
- inventory operator execution depth расширен дальше: replenishment jobs теперь поддерживают `approve -> dispatch -> export` path, а `/inventory` умеет запускать эти actions и показывать CSV-style export artifact поверх persisted replenishment batches
- inventory execution depth расширен до receive-against-job reconciliation: replenishment job теперь может materialize linked receiving и закрыть его через existing receiving completion path, а job workflow metadata хранит receipt reference/status для traceability между restock plan и фактическим stock intake
- inventory supplier-facing execution depth расширен еще дальше: replenishment jobs получили supplier handoff/status sync endpoints и multi-format export (`csv|json`), а `/inventory` теперь может сопровождать batch до внешнего supplier state without introducing another storage boundary
- inventory connector path перестал быть purely metadata-backed: phase18 теперь читает active supplier connectors из enterprise integration registry, поддерживает connector-driven supplier sync/history endpoints и пишет supplier execution history в shared `ConnectorExecutionLog`, что делает phase20 ecosystem foundations реальным runtime dependency, а не только admin surface
- inventory supplier runtime hardening закрыт поверх того же connector path: webhook callbacks теперь secret-verifiable по tenant/global secret registry, file-import reconciliation checksum-verifiable, а оба transport-specific пути idempotent по `deliveryId/importId` с replay markers и duplicate-safe reconciliation metadata
- inventory supplier recovery loop больше не теряет failed state на rollback: verification failures persist как `lastFailure*`/`reconciliation=FAILED`, operator может вызвать `supplier-replay` для webhook/file-import jobs, а `/inventory` показывает recovery signals прямо на replenishment cards
- inventory retry orchestration больше не ограничен ручным replay: failed supplier reconciliations можно requeue-ить точечно или через tenant/store sweep, workflow metadata хранит `nextRetryAt/retryAttemptCount`, а shared connector logs фиксируют retry queue actions как отдельные operational artifacts
- file-import supplier transport тоже материализован глубже: inventory теперь выдает pickup artifact для supplier handoff и принимает dropped supplier response через dedicated file-drop endpoint, который сам нормализует payload/checksum перед existing import reconciliation logic
- queued supplier retries теперь можно и time-driven исполнять: inventory получил due-retry runner, который переводит подходящие `RETRY_QUEUED` jobs в `RETRY_DISPATCHED`, обновляет retry processing counters и тем самым закрывает gap между operator queueing и будущим scheduler-driven execution
- worker-ready hookup больше не только в теории: inventory module теперь содержит env-gated background retry loop и status endpoint для наблюдаемости, так что включение periodic due processing сводится к конфигурации deployment/runtime scope
- supplier transport matrix расширен дальше simulated/webhook/file-import: inventory теперь поддерживает `HTTP_PUSH` connector mode с endpoint/method-driven outbound request artifact и provider-style sync path, что приближает phase18 к реальным external delivery adapters без вынесения отдельного transport service
- `HTTP_PUSH` transport уже не purely declarative: inventory inline-delivers outbound supplier request через actual HTTP call, сохраняет response metadata в workflow artifact и подтвержден e2e с локальным provider mock, то есть phase18 имеет один реальный external IO path внутри supplier connector runtime
- `HTTP_PUSH` transport hardening теперь включает manifest-driven auth/policy: secret-backed header auth, configurable timeout, accepted HTTP status set и response-status mapping уже реально применяются в inventory runtime и покрыты e2e на successful plus rejected provider responses
- supplier retry lifecycle для inventory теперь surfaced in UI: replenishment cards показывают manifest-driven retry policy, retry state, terminal/dead-letter markers и no longer offer retry queueing on terminal artifacts, so operator surface matches the runtime state machine
- supplier operations control plane для inventory теперь surfaced in UI too: отдельный overview KPI block, dead-letter queue surface и worker controls/status (`run now/pause/resume`) дают operator-auditable path поверх того же replenishment state machine
- inventory supplier provider-profile block уже surfaced in UI: `/inventory` показывает available provider profiles и provider profile identity/default-policy visibility прямо на connector/job/dead-letter surfaces
- inventory supplier provider-adapter block already surfaced in UI: `/inventory` показывает available provider adapters and provider adapter identity/default-policy visibility прямо на connector/job/dead-letter surfaces
- inventory supplier connector readiness block already surfaced in UI: `/inventory` shows onboarding/readiness summary, blocked reasons/checks, selected connector readiness summary and readiness labels on connector list surfaces before supplier handoff
- supplier connector rollout/install automation surfaced in UI: `/enterprise` exposes install-readiness and install-runtime actions for activation requests, and `/inventory` shows install source plus installed runtime metadata on supplier connectors and activation state
- runtime rollout governance surfaced in UI: `/enterprise` shows installed runtime rollout health/drift/governance actions on activation cards, and `/inventory` shows rollout governance status for installed connectors and activation state cards
- provider-runtime-policy compatibility layer surfaced in UI: `/enterprise` and `/inventory` now show provider policy health, compatibility and readiness for supplier connector installs and activation cards
- supplier connector rollout/install automation is now runtime-backed too: enterprise activation requests expose install-readiness and install package preview, `install-runtime` materializes or updates tenant-scoped supplier connectors from template/publication-backed artifacts, and inventory read models prefer tenant-installed runtime connectors over global baselines for the same `connectorKey/version`
- activation execution policy snapshot now visible in enterprise: activation cards show policy key, risk level, execution model, signed-publication and tenant-install requirements, plus rollout governance so external provider execution is gated before install-runtime
- phase20 ecosystem foundations получили второй concrete runtime consumer besides inventory: enterprise integration registry теперь materializes version-scoped developer package/docs artifacts (`developer-package`, `developer-docs`) из registry entries, connector templates и partner SDK contracts, а `/enterprise` показывает compatibility/lifecycle preview уже как developer-facing deliverable, а не только admin data
- phase20 ecosystem distribution layer перестал быть только planned next step: registry entries теперь можно publish в persistent `IntegrationPublication` artifacts с release attestation, digest/signature metadata, publication status lifecycle и telemetry events; `/enterprise` показывает publications, attestation payload и adoption events как operator-managed distribution surface
- phase20 public delivery тоже materialized: `PUBLIC` publications теперь доступны через unauthenticated API `GET /enterprise/publications/:connectorKey/:version{,/package,/docs}` и public web page `/integrations/[connectorKey]/[version]`; public fetches автоматически создают telemetry events, так что external distribution path уже наблюдаем и не живет только внутри admin workspace
- phase20 distribution governance перестал быть purely manual: enterprise runtime теперь вычисляет `publication-readiness` из `manifest.distribution`, блокирует invalid publication attempts по public/channel/signature policy и отдает aggregated publication analytics поверх raw telemetry events, так что operator видит не только event log, но и can-publish/adoption summary
- phase20 signed release lifecycle расширен до key rotation: enterprise runtime теперь показывает `signing-readiness` по publication, умеет `re-sign` existing snapshot новой secret key без republish из live registry и пишет `RE_SIGNED` event, так что release signing больше не одноразовый шаг только в момент initial publish
- phase20 contract lifecycle теперь включает automated sunset handling: enterprise runtime вычисляет `lifecycle-readiness` из publication snapshot, умеет single-item `apply-lifecycle` и batch `lifecycle-sweep`, а public availability теперь может закрываться scheduled/operator-driven revoke path на уровне publication artifacts без ручного status bookkeeping
- phase20 partner onboarding/distribution workflow больше не ограничен public-only delivery: partner-preview artifacts теперь поддерживают public access request, operator approval with generated grant token и gated fetch через `grantToken`, а `/enterprise` показывает distribution requests рядом с publication telemetry
- phase20 enterprise distribution analytics ушли дальше single-publication event totals: public/partner metadata fetches теперь тоже телеметрируются, publication analytics включают request/grant funnel и time-window metrics, а новый `distribution-overview` summary агрегирует portfolio-level visibility/channel mix, access request pipeline, fetch volume и top publications для текущего tenant/org scope
- fixed toolchain drift for schema-first additions: `@exetron/database` build теперь всегда пересинхронизирует generated Prisma client в `dist`, чтобы downstream `@exetron/api` не компилировался против stale package types после новых migrations/models
- для `organizations` template/policy/pack status сейчас materialize через managed JSON metadata, а membership/link/evidence/secret/archive flows местами используют soft-status or delete semantics по текущей phase schema; отдельная physical normalization не требуется для roadmap exit, но остается возможной later hardening wave
- partner onboarding automation materialized поверх distribution requests: onboarding readiness/package read model и `issue-onboarding` flow дают `/enterprise` отдельный partner handoff workspace с checklist, URLs, grant binding и package summary вместо смешивания onboarding с generic approval flow
- activation governance surface now spans both sides of the boundary: `/enterprise` shows inventory connector activation requests/readiness, while `/inventory` shows activation state/readiness per connector so rollout approval and runtime readiness stay visible together
- activation rollout governance is now fully executable from the operator surface: `/enterprise` can refresh runtime rollout state, reconcile drifted installs, apply governance snapshots, and deactivate blocked installed runtimes without dropping to manual API calls

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
- `PHASE 16`: provider adapters, webhook inbox, payment operations/settlements, connector execution logs, and hardware bridge foundations
- `PHASE 17`: table-backed billing runtime, onboarding billing bootstrap, plans/subscriptions/invoices/quotas/entitlements/trials/resellers
- `PHASE 18`: inventory runtime, BOM availability, receiving/adjustments/reservations/ledger, stop-list rules, and stock-aware order lifecycle hooks
- `PHASE 18`: supplier provider runtime policy catalog and `WARN_ONLY` compatibility visibility now layer on top of inventory connector readiness, so provider-governed direct connectors surface rollout debt without hard-breaking current operator handoff paths
- `PHASE 19`: organizations, governance policies, rollout templates/applications, white-label packs, partner accounts, and operator CRUD breadth across org assets
- `PHASE 20`: enterprise federation/compliance/secret/deployment/registry foundations plus operator CRUD breadth and redacted secret read models
- `PHASE 20`: enterprise inventory activation/install/governance now also materializes shared provider runtime policy catalog and applies it in `STRICT` mode for activation/install/runtime-rollout readiness
