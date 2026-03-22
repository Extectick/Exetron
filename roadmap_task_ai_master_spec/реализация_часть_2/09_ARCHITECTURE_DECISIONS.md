# Architecture Decisions Part 2

## Правило ведения ADR после baseline
Начиная с `PHASE 11`, каждое стратегическое cross-cutting решение должно добавляться новым ADR.
Старые ADR из `реализация_часть_1/09_ARCHITECTURE_DECISIONS.md` не переписываются задним числом.

## ADR-026 — Continuation Strategy For Post-Baseline Roadmap
Принято: вести post-baseline roadmap как продолжение baseline implementation history, а не как новый независимый проект.
Причина:
- baseline `PHASE 0 -> PHASE 10` уже доказывает жизнеспособность выбранной архитектуры;
- новые фазы должны эволюционировать existing modular monolith, а не пересобирать foundation;
- это сохраняет continuity для ИИ, tracker, task boards и future audits.

## ADR-027 — Sequential Phase Execution For `PHASE 11 -> PHASE 20`
Принято: основной порядок реализации идет строго по фазам `11 -> 20`, даже если wave labels тематически пересекаются.
Причина:
- product maturity и globalization должны появиться раньше online, billing and enterprise depth;
- это снижает риск смешения scope между соседними доменами;
- task boards и tracker остаются однозначными для ИИ-сессий.

## ADR-028 — New Strategic Decisions Must Append, Not Replace
Принято: при изменении стратегических границ phases `11 -> 20` добавлять новый ADR с новой нумерацией, а не редактировать предыдущие решения так, как будто они всегда были такими.
Причина:
- решение должно иметь историю и причину появления;
- silent edits разрушают контекст для ИИ и для последующих сессий;
- это особенно важно для localization, billing, enterprise and ecosystem work, где последствия выходят за пределы одной фазы.

## ADR-029 — Signed Public Access Tokens For Kiosk Runtime
Принято: публичный kiosk runtime больше не использует `deviceId` как достаточный идентификатор доступа; bootstrap и checkout требуют signed kiosk access token, который выдается только из защищенного device API.
Причина:
- raw `deviceId` в public URL делал kiosk bootstrap слишком легко угадываемым и не давал controlled public access boundary;
- stateless signed token позволяет harden public kiosk flow без новой таблицы, миграции или tenant-specific storage;
- claims токена проверяются against active kiosk device, tenant, store and device code, поэтому existing device model и audit trail переиспользуются без отдельного public-session domain.

## ADR-030 — Provider Config Secrets Must Be Separated From Public Settings
Принято: payment provider configs больше не трактуют все runtime-параметры как обычный JSON `settings`; чувствительные значения передаются как отдельные `secrets`, сохраняются в encrypted envelope и наружу возвращаются только как redacted metadata.
Причина:
- provider configs будут эволюционировать из simulated providers в реальные acquiring/fiscal integrations, где raw API keys and tokens нельзя возвращать из обычного CRUD list/read path;
- separation `settings vs secrets` вводит production-safe boundary без немедленной миграции на внешний secret manager и без новой таблицы на текущем этапе;
- redacted DTO и encrypted persistence позволяют сохранить existing provider-config runtime model, но не закреплять плохой паттерн хранения секретов как plain JSON config.

## ADR-031 — Analytics Precompute Reuses Snapshot Artifacts With Inline-Now Async Boundary
Принято: analytics precompute для owner cabinet использует existing `AnalyticsSnapshot` как artifact contract, а `POST /analytics/precompute` выполняется inline сейчас, но фиксирует явную async boundary через `analytics.precompute_requested/completed` events.
Причина:
- owner analytics уже имели persisted snapshot storage, поэтому новый precompute слой должен переиспользовать существующий artifact вместо дублирования таблиц и форматов;
- inline execution закрывает product-maturity потребность PHASE 11 без раннего ввода queue/worker инфраструктуры;
- отдельные precompute events и artifact key заранее формируют контракт для будущего background worker without redefining owner analytics semantics.

## ADR-032 — External Observability Is Introduced As Configured Boundary Before Full Export
Принято: PHASE 11 фиксирует external observability как runtime contract и status surface (`GET /health/observability` + exporter envs), но не внедряет полноценный always-on collector/export pipeline в рамках этой фазы.
Причина:
- текущие process-local metrics и structured logs достаточны для baseline hardening, но multi-instance rollout требует явной boundary между internal probes и future external export;
- status endpoint и env contract дают testable operational surface без premature инфраструктурной миграции;
- это позволяет следующей итерации подключить OTLP/alerts на уже определенный runtime contract, а не придумывать его заново под давлением production rollout.

## ADR-033 — Localization Registry Reuses Existing Settings Storage Instead Of New Phase-Local Tables
Принято: PHASE 12 хранит localization preferences, country profiles, localized content и localized templates поверх existing `TenantSetting`/`StoreSetting` ключей, а не вводит новые dedicated Prisma tables в этой фазе.
Причина:
- фаза должна быстро зафиксировать platform capability и единый runtime contract для locale/country/content/template resolution, не раздувая миграции до того, как storefront, notifications и billing докажут окончательные write patterns;
- existing settings storage уже tenant/store-scoped, audited и совместима с multi-tenant boundary, поэтому подходит как controlled registry для AI-driven implementation without schema forks;
- это сохраняет freedom для последующего выделения отдельных доменных таблиц, если `PHASE 13+` покажут, что catalogs, customer messaging или billing требуют другой write/read shape.

## ADR-034 — Locale Resolution And Country Policy Are Centralized Before Channel Expansion
Принято: locale resolution и country-aware policy вводятся как единый localization service с precedence `query locale -> customer locale -> store channel locale -> store default -> tenant channel locale -> tenant default -> country profile default -> fallback`, а compiled catalog получает localization metadata вместо country-specific веток в runtime code.
Причина:
- без централизованного precedence порядка web, kiosk, POS и будущий storefront быстро разъедутся по локали и fallback behavior;
- country profile должен описывать currency, tax metadata и compliance flags как policy layer, а не протекать условными `if country == ...` в pricing/checkout flow;
- synchronous language-pack import/export и template rendering достаточны для текущей фазы, но новая service boundary уже оставляет место для async sync/generation в будущих notification и marketplace phases.

## ADR-035 — Public Storefront Reuses Existing Commerce Core Through The `DELIVERY` Channel
Принято: PHASE 13 не вводит новый storefront-only order domain. Public online commerce использует existing compiled catalog, carts, checkout, payments и order lifecycle, а текущий storefront runtime маппится на канал `DELIVERY`.
Причина:
- это позволяет быстро открыть customer-facing online channel без дублирования order/cart/payment logic рядом с kiosk и POS;
- `DELIVERY` уже является наиболее близким operator-facing commerce channel для public online flow и дает совместимость с existing analytics, customization и payment-provider resolution;
- выделение отдельного storefront channel имеет смысл только если будущие fulfillment or billing phases докажут, что `DELIVERY` semantics больше не покрывают online commerce behavior.

## ADR-036 — Public Storefront Access And Customer Updates Stay Stateless And Event-Backed
Принято: public storefront access оформляется stateless signed tokens для cart access, customer sessions, QR entry links и order tracking, а customer-facing status updates фиксируются как `storefront.status_hook_emitted` и `storefront.notification_queued` events в existing `OrderEvent` + outbox pipeline.
Причина:
- public online channel требует security boundary сильнее, чем raw ids/query params, но не оправдывает отдельную session table or public identity store в рамках PHASE 13;
- stateless tokens переиспользуют existing JWT secret model и позволяют безопасно открыть guest, QR и tracking flows без новой persistence surface;
- event-backed notification artifacts отделяют customer update contract от будущих real outbound providers и не зашивают delivery side effects в synchronous checkout path.

## ADR-037 — Fulfillment Extends Existing Cart And Order Snapshots Instead Of Creating A Parallel Aggregate
Принято: PHASE 14 добавляет fulfillment как snapshot fields на `Cart` и `Order` (`mode`, `fee`, payload, promised time, ETA, fulfillment status) и продолжает писать operational changes в existing `OrderEvent`/outbox pipeline, а не вводит новый fulfillment aggregate с отдельной таблицей состояния на этой фазе.
Причина:
- delivery fees должны участвовать в cart/order totals и payment amounts, поэтому fulfillment не может жить только как sidecar event without canonical snapshot;
- текущей фазе нужна operational depth для delivery/pickup/dine-in, но не нужна новая domain boundary с собственной консистентностью и cross-aggregate coordination;
- snapshot + events дает достаточно данных для storefront tracking, dispatch board и later analytics без разрушения existing order lifecycle.

## ADR-038 — Store Fulfillment Config Stays Settings-Backed And Provider-Agnostic In PHASE 14
Принято: delivery zones, pickup windows, dine-in tables и manual provider extension points хранятся как store-scoped settings-backed config (`fulfillment.config`), а operator actions остаются protected APIs with event-backed updates вместо реальной courier/provider integration.
Причина:
- PHASE 14 должен сначала зафиксировать runtime contract для fees, ETA/SLA, dispatch и customer tracking, не расползаясь в отдельные zone/table/provider tables before proven write pressure;
- settings-backed config already matches tenant/store isolation, audit and AI-driven iteration speed for this wave;
- provider-agnostic extension points оставляют место для later delivery/fiscal/payment integrations, но не заставляют сейчас выбирать premature storage or integration model.

## ADR-039 — Customer Identity Stays Separate From Staff Identity And Uses A Tenant-Scoped Growth Model
Принято: `PHASE 15` не расширяет existing `User`/RBAC model до customer CRM. Customer growth вводится отдельным доменом `CustomerProfile` с tenant-scoped normalized phone ownership, `LoyaltyAccount` и append-only `LoyaltyLedgerEntry`.
Причина:
- staff users и end customers имеют разный lifecycle, permission model и privacy surface; объединение их в одну identity table быстро размоет boundary между operations и CRM;
- storefront уже использует customer phone/session semantics, поэтому tenant-scoped customer profile легче встраивается в existing online commerce runtime без переделки auth/RBAC layers;
- отдельный loyalty account + ledger дает idempotent earn/redeem/adjust contract, пригодный для later billing, subscriptions or partner integrations, не делая checkout зависимым от staff identity semantics.

## ADR-040 — Promotions Materialize As Explicit Cart And Order Snapshots, Not Hidden Dynamic Pricing State
Принято: promotions в `PHASE 15` применяются к открытому cart и materialize как `discountTotal`, `promotionCode` и `promotionSnapshot` на `Cart`/`Order`; pricing-affecting cart mutations и fulfillment recalculation сбрасывают applied promo вместо неявного auto-recompute.
Причина:
- checkout, payments, analytics и customer loyalty должны видеть тот же discount artifact, что видел customer/operator в момент оформления, а не пересчитывать его постфактум against evolving promotion state;
- explicit snapshot keeps promotions compatible with existing order/payment primitives and makes repeat-order, tracking and auditing deterministic;
- reset-on-mutation policy проще и безопаснее для текущей фазы, чем early introduction of a full promotion rule engine with precedence over catalog pricing, customization and fulfillment fees.

## ADR-041 — PHASE 16-20 Foundations Stay Contract-First And May Use Phase-Local Persistence
Принято: для `PHASE 16 -> PHASE 20` приоритетом считается working runtime contract, API/UI surfaces и regression-safe integration with existing core. Если финальная persistence model еще не доказана, допускается phase-local storage strategy (`settings`, raw SQL tables, in-memory state), но она должна быть явной, isolated и documented.
Причина:
- sequential delivery `16 -> 20` важнее premature schema consolidation, потому что payments/orders/storefront/onboarding уже являются working core и их нельзя ломать ради “идеальной” persistence shape;
- integrations и inventory требуют runtime behavior уже сейчас, поэтому raw/bootstrap tables acceptable, если они bounded и не конфликтуют с existing aggregates;
- billing, organizations и enterprise layers на этой волне в первую очередь фиксируют contracts and operator surfaces; forcing full normalized storage too early only slows delivery and raises regression risk without proven usage pressure.

## ADR-042 — Organizations And Enterprise Foundations Graduate From In-Memory To Persistent Runtime Storage
Принято: после закрытия roadmap exit organizations and enterprise foundations больше не держатся на in-memory state. `PHASE 19` переходит на persistent org tables/Prisma-backed runtime, а `PHASE 20` хранит enterprise artifacts в persistent runtime tables и existing Prisma models.
Причина:
- после фиксации contracts и e2e сценариев риск от потери state между process restarts стал выше, чем стоимость hardening persistence;
- `Organization`, `GovernancePolicy`, `RolloutTemplate`, `EnterpriseIdentityProvider`, `AuditExportJob`, `CompliancePack`, `PartnerSdkContract` и related artifacts уже имеют стабильные shapes и подходят для persistence without redesigning phase boundaries;
- этот шаг убирает самый слабый operational gap `PHASE 19/20`, но сознательно не форсирует немедленную migration consolidation для `PHASE 16/17/18`, где storage strategy все еще остается phase-local by design.

## ADR-043 — Billing Foundation Graduates From Settings Snapshot To Dedicated Tables Before Inventory Consolidation
Принято: post-roadmap hardening переводит `PHASE 17` billing runtime с `TenantSetting.billing.state` на dedicated billing tables из schema, но сохраняет phase-local runtime table bootstrap до отдельной forward-only migration wave.
Причина:
- billing уже участвует в onboarding bootstrap и runtime entitlement/quota flows, поэтому table-backed persistence снижает operational risk сильнее, чем продолжение settings-snapshot storage;
- billing schema shapes (`BillingPlan`, `BillingAccount`, `Subscription`, `Invoice`, `EntitlementGrant`, `QuotaCounter`, `TrialGrant`, `ResellerAccount`) стабилизировались и могут быть materialized без изменения phase boundaries и public contracts;
- inventory/order coupling все еще существенно тяжелее billing migration, поэтому hardening идет сначала по billing, а окончательная migration consolidation для `PHASE 16/18` остается отдельной волной.

## ADR-044 — Inventory Reservation Semantics Are Centralized In The Inventory Module Before Storage Migration
Принято: в post-roadmap hardening reservation planning, reserve/release/consume flows для `PHASE 18` живут в `InventoryService`; `OrdersModule` больше не содержит прямой raw SQL logic against inventory tables.
Причина:
- checkout, cancellation и completion paths должны использовать одну и ту же stock policy, иначе reservation semantics быстро разъезжаются между `orders` и `inventory`;
- вынос orchestration в inventory boundary снижает риск регрессий при будущей migration wave, потому что storage change теперь можно делать в одном модуле;
- это оставляет текущую phase-local persistence strategy нетронутой, но убирает самый опасный architectural leak между order lifecycle и inventory storage details.

## ADR-045 — Inventory Storage Moves To Prisma-Mapped Phase Tables Before Forward-Only Migration Consolidation
Принято: post-roadmap hardening переводит `PHASE 18` inventory runtime с raw SQL access на Prisma-backed access, при этом текущие phase tables сохраняются и подключаются через schema `@@map/@map` до отдельной migration consolidation wave.
Причина:
- inventory module already had stable table shapes and passing e2e scenarios, so replacing storage access layer is lower risk than simultaneous table redesign and data migration;
- Prisma-backed access дает typed query surface и убирает hand-written SQL from inventory CRUD/runtime paths without breaking phase-local table compatibility;
- forward-only migrations для `PHASE 16/18` still remain necessary, but теперь этот долг изолирован до migration story, а не mixed storage/runtime semantics.

## ADR-046 — Phase 16-20 Storage Baseline Is Formalized In Forward-Only Prisma Migrations Before Runtime Bootstrap Cleanup
Принято: после стабилизации `PHASE 16 -> PHASE 20` migration history догоняет фактический runtime через idempotent forward-only migration `20260319203427_phase16_20_storage_consolidation`; runtime bootstrap DDL сохранялся только как временный self-healing/compatibility layer до отдельной cleanup wave.
Причина:
- payment, billing, inventory, organizations и enterprise tables уже используются в runtime и e2e, поэтому отсутствие formal migration history стало более опасным, чем поддержка временного dual path `migration + bootstrap`;
- idempotent migration позволяет безопасно зафиксировать storage baseline как для чистых баз, так и для окружений, где таблицы уже были materialized через `OnModuleInit`;
- удаление bootstrap DDL оставлено отдельной cleanup wave, чтобы не смешивать schema registration с operational rollout gating и не сломать existing developer/test bootstrap assumptions.

## ADR-047 — Phase 16-20 Runtime No Longer Auto-Creates Storage Surfaces After Migration Consolidation
Принято: после прохождения migration consolidation и regression e2e `PHASE 16 -> PHASE 20` runtime `CREATE TABLE` bootstrap удаляется из payments, billing, inventory, organizations и enterprise modules; app startup теперь опирается на уже примененные migrations.
Причина:
- dual path `migrations + runtime DDL` уже не давал дополнительной архитектурной ценности и скрывал operational drift между real database lifecycle и app startup behavior;
- regression/e2e подтвердили, что phase16-20 runtime стабильно работает на migration-only baseline без скрытого self-healing table creation;
- fail-fast dependency on `db:deploy` before runtime лучше соответствует production discipline, чем silent auto-materialization schema inside modules.

## ADR-048 — Migration-First Startup Is Enforced In Dev, E2E And Runtime Guard Paths
Принято: после перехода на migration-only storage baseline root/api dev scripts и `@exetron/api test:e2e` автоматически выполняют `db:deploy`, а `PrismaService` проверяет, что последняя локально известная migration присутствует в `_prisma_migrations` до старта приложения.
Причина:
- одного только architectural decision про migration-first baseline недостаточно, если local dev и e2e paths могут стартовать приложение на stale schema;
- auto-`db:deploy` в dev/e2e убирает человеческий фактор из самых частых startup paths, а runtime guard дает явный fail-fast для direct `start` и misconfigured environments;
- такой guard дешевле и честнее, чем возвращать module-level table bootstrap, потому что он сохраняет real database lifecycle visible and explicit.

## ADR-049 — PHASE 19/20 CRUD Expansion Uses Shared Operator List Conventions And Modular Slices First
Принято: перед расширением operator CRUD breadth для `PHASE 19 organizations` и `PHASE 20 enterprise` вводятся shared operator list/query conventions (`OperatorListQuery`, `OperatorListQueryDto`) и выполняется file-level modularization `organizations`/`enterprise` на controller/service/helpers/state slices.
Причина:
- для следующей волны нужны согласованные `page/filter/sort/status/archive` semantics, иначе parallel implementation по org/enterprise surfaces быстро разъедется по DTO и UI expectations;
- `organizations.module.ts` и `enterprise.module.ts` были слишком крупными phase-local файлами и повышали риск merge conflicts при параллельной реализации `P19-A/B/C` и `P20-A/B/C`;
- modular slices дают безопасную точку расширения для operator CRUD breadth, не меняя текущие routes и response shapes на подготовительном шаге.

## ADR-050 — PHASE 19/20 Operator CRUD Breadth Completes On Modular Slices Without New Schema Wave
Принято: `PHASE 19 organizations` и `PHASE 20 enterprise` добирают operator CRUD breadth поверх уже существующей persistent schema и modular slices без новой migration wave. Для status/archive semantics используются текущие phase boundaries: explicit status columns там, где они уже есть, managed JSON metadata для template/policy/pack artifacts и redacted read model для secret registry.
Причина:
- roadmap exit требовал operationally usable list/detail/update/archive/status surfaces для org/enterprise domains, но новая schema wave на этой стадии только подняла бы regression risk без доказанной необходимости;
- existing phase19/20 schema already supports most operator flows directly, а artifact-like entities (`GovernancePolicy`, `RolloutTemplate`, `WhiteLabelPack`, `TemplateApplication`) логичнее держать на managed metadata/status semantics, чем преждевременно перестраивать таблицы;
- secret registry требует отдельного read contract: operators должны видеть existence/scope/metadata entries, но не raw secret values, поэтому breadth completion фиксирует redacted API model как boundary по умолчанию.

## ADR-051 — PHASE 18 Inventory Physical Normalization Tightens Existing Tables Instead Of Forking The Runtime
Принято: post-roadmap hardening не вводит новые `inventory_v2` tables и не fork'ает runtime. Вместо этого existing `inventory_*` tables переводятся с text core keys на UUID-backed columns, а referential integrity добавляется database-level foreign keys к `Tenant`, `Store`, `Product`, `ProductVariant` и inventory-local entities.
Причина:
- inventory runtime и order coupling уже стабилизированы и проходят e2e, поэтому safest path — tightening existing storage shape, а не parallel table set plus backfill/runtime dual-write;
- текущий inventory domain фактически уже использует UUID ids во всех critical paths, так что migration может безопасно materialize реальный physical contract without changing API/service semantics;
- такой подход закрывает deepest PHASE 18 storage debt, сохраняет current `inventory_*` naming/Prisma mapping compatibility и оставляет future improvements только на уровне richer Prisma relations or operator UX, а не rescue-level persistence repair.

## ADR-052 — Enterprise Registry Publication Uses Snapshot Artifacts, Release Attestation And Separate Telemetry Tables
Принято: следующий `PHASE 20` ecosystem layer строится не через live public read of `IntegrationRegistryEntry`, а через explicit `IntegrationPublication` artifacts и `IntegrationPublicationEvent` telemetry. Publication materializes snapshot package/docs payloads, stores attestation metadata (`digest`, optional HMAC signature, key reference, payload) и имеет собственный status lifecycle (`PUBLISHED/REVOKED/...`) независимо от дальнейших edits в registry entry.
Причина:
- live recomputation developer package/docs из registry entry неудобна для external consumers: artifacts должны быть стабильны, даже если template/contract metadata позже меняются или registry entry deprecates further;
- contract lifecycle depth в roadmap next step требовала signed release boundary и adoption telemetry, но полноценный marketplace/public CDN был бы слишком большим скачком; publication artifacts дают минимально достаточный distribution layer без новой product category;
- separation publication/telemetry от registry metadata keeps responsibilities clean: registry manages canonical connector version metadata, publication manages distributable snapshot + attestation, telemetry tracks downstream consumption without polluting manifest JSON.

## ADR-053 — Public Enterprise Distribution Reuses Publication Snapshots With Visibility Gating Instead Of A Separate Public Content Store
Принято: public delivery для enterprise integration artifacts не создает отдельный CDN/content registry внутри roadmap scope. Вместо этого external read path (`/enterprise/publications/...` и public web page `/integrations/[connectorKey]/[version]`) читает только `IntegrationPublication` со строгим фильтром `visibility=PUBLIC`, `status=PUBLISHED`, `revokedAt IS NULL`, а каждый public package/docs fetch автоматически пишет telemetry event.
Причина:
- publication snapshots уже содержат immutable package/docs payload и attestation metadata, поэтому дублировать их в отдельный public store на этом этапе избыточно;
- visibility gating на existing publication artifacts дает minimal viable public distribution path без расслоения источников истины между operator/runtime/public surfaces;
- automatic telemetry на public fetches делает external adoption observable сразу, не дожидаясь отдельной analytics/export subsystem specifically for marketplace-style delivery.

## ADR-054 — Publication Governance Is Evaluated From `manifest.distribution` Before Release Materialization
Принято: enterprise publication readiness и publish gating вычисляются из `IntegrationRegistryEntry.manifest.distribution` до создания `IntegrationPublication`. Runtime materializes explicit readiness contract (`publication-readiness`) и блокирует release, если нарушены distribution policy constraints: no connector template for version, public access forbidden, channel not allowed, or signed publication required but no signing key is available.
Причина:
- после появления public delivery недостаточно просто иметь `publish` endpoint; release governance должна быть явно вычислима до materialization, иначе operators узнают об invalid state только постфактум;
- `manifest.distribution` уже является natural home для public access, allowed channels и signed-publication expectations, поэтому policy logic не должна расползаться по ad hoc controller rules или UI-only checks;
- readiness + aggregated analytics together give a more durable contract lifecycle boundary: operators see whether a release can be published, why it is blocked, and how already published artifacts are adopted, without introducing a separate policy service this early.

## ADR-055 — Signed Publication Rotation Re-Signs Existing Snapshot Artifacts Instead Of Republishing From Live Registry
Принято: key rotation для enterprise publications не делает новый publish из текущего `IntegrationRegistryEntry`, а re-signs already materialized `IntegrationPublication.artifact`. Runtime сравнивает current key ref с latest available signing key (`signing-readiness`) и при `re-sign` пересчитывает attestation/signature поверх того же package/docs snapshot, сохраняя `publishedAt` artifact history и записывая отдельный `RE_SIGNED` event.
Причина:
- rotation нужна именно как cryptographic lifecycle control, а не как скрытый republish; иначе новый key rollout смешался бы с возможными изменениями registry/template/contract state after original release;
- immutable publication snapshot already is the source of truth for distribution, so attestation refresh must operate on that snapshot to preserve artifact lineage;
- separate readiness + `RE_SIGNED` event make key rotation auditable and operator-visible without inventing a dedicated signing service or external KMS orchestration at this phase.

## ADR-056 — Deprecation Rollout Automation Operates On Publication Snapshots And May Batch-Revoke Sunset-Due Artifacts
Принято: sunset/deprecation automation в enterprise ecosystem не читает live registry state при revoke time. `lifecycle-readiness`, `apply-lifecycle` и batch `lifecycle-sweep` вычисляют lifecycle status из already published artifact snapshot (`publication.artifact.package.lifecycle`) and act on `IntegrationPublication` status directly. When a sunset-due published artifact is found, runtime can auto-revoke it and records dedicated lifecycle events.
Причина:
- once publication becomes the distribution source of truth, deprecation enforcement must stay attached to the same immutable artifact boundary; otherwise revoke behavior could drift if registry manifest changes after the release was published;
- lifecycle automation is operationally useful even without a background worker: an explicit single-item apply path plus sweep endpoint already removes manual status bookkeeping and prepares the contract for future scheduling;
- dedicated lifecycle events preserve auditability and make revocation due to sunset policy distinguishable from manual operator revoke or key/signature maintenance actions.

## ADR-057 — Partner-Preview Distribution Uses Approved Grant Tokens Instead Of Making Partner Artifacts Public
Принято: `PARTNER` publications do not become readable through the same public path by default. External consumer onboarding for partner-preview/publication channels uses explicit `IntegrationDistributionRequest` approval flow. A public request can be created for a published partner artifact, operator then approves/rejects/revokes it, and approved requests receive a grant token that unlocks read access for that publication through the existing public endpoints.
Причина:
- partner distribution needed a real onboarding path beyond `PUBLIC`/`404`, but immediately introducing full partner identity federation or dedicated portal would overshoot current scope;
- grant-token gating keeps the distribution contract close to publication artifacts and lets the team reuse public package/docs delivery endpoints without collapsing partner-preview into global public access;
- explicit request/approval/revoke lifecycle gives auditability and operator control while staying lighter than a full partner account / marketplace entitlement system.

## ADR-058 — Enterprise Distribution Analytics Track Metadata Reach, Request Funnels And Portfolio Scope Separately From Raw Event Logs
Принято: enterprise ecosystem analytics do not stop at raw `IntegrationPublicationEvent` lists or per-publication package/docs totals. Runtime now materializes two explicit read models on top of publication events and distribution requests: richer publication analytics with request/grant funnel plus time windows, and portfolio-level distribution overview scoped by tenant/organization. Metadata fetches for both `PUBLIC` and grant-token `PARTNER` access are recorded as first-class events so operator analytics can observe discovery/reach separately from package/docs consumption.
Причина:
- once partner/public distribution gained readiness, signing, lifecycle automation and grant-token onboarding, raw event logs were no longer sufficient for operator decisions; the team needed a stable read model for adoption funnels and portfolio health without adding a separate BI subsystem;
- metadata reach, package fetches and docs fetches represent different stages of external consumer behavior, so collapsing them into one generic download counter would hide whether artifacts are being discovered, evaluated or actively consumed;
- keeping these analytics derived from existing publication artifacts, events and distribution requests preserves the immutable publication boundary and avoids inventing another storage domain before real connector/provider runtimes arrive.

## ADR-059 — Partner Distribution Grants Are Time-Bound And Governance-Enforced Instead Of Staying Indefinite Access Tokens
Принято: approved `IntegrationDistributionRequest` no longer means an unbounded partner grant by default. Distribution requests may now carry `grantedConsumerKey`, `grantExpiresAt` and `revokedAt`; grant-token resolution on public partner fetch paths rejects expired grants and consumer-bound mismatches; operator runtime materializes explicit governance controls through `governance-readiness`, single apply and batch governance sweep endpoints.
Причина:
- once partner-preview access moved from simple `PUBLIC/404` to approved grant tokens, leaving those grants effectively eternal would have undermined the whole distribution-governance boundary; expiry and revocation had to become first-class runtime concepts, not just manual notes in operator UI;
- consumer binding is a lightweight but meaningful control before full partner identity/runtime federation exists: it lets the platform constrain a granted artifact to a known external consumer key without introducing a separate IAM product inside roadmap scope;
- sweep/apply governance paths mirror publication lifecycle automation and keep operator control explicit today while preparing the contract for future scheduled enforcement or external policy engines.

## ADR-060 — Inventory Supplier Runtime Uses Transport-Aware Handoff With Normalized Webhook And Import Reconciliation
Принято: `PHASE 18` supplier runtime больше не ограничивается одним simulated polling path. Active supplier connectors from integration registry may now declare transport mode `SIMULATED`, `WEBHOOK` or `FILE_IMPORT` in manifest runtime metadata. Replenishment handoff materializes transport-aware workflow state, while supplier callbacks/imports are normalized through dedicated inventory endpoints and logged in shared `ConnectorExecutionLog`.
Причина:
- inventory already was the first real consumer of enterprise registry/connectors, so the next meaningful step was not another enterprise read model but actual supplier-facing execution depth on the existing replenishment flow;
- transport-aware handoff keeps the orchestration boundary stable: jobs still live inside inventory, connector lookup still comes from registry, and execution telemetry still lands in shared connector logs, but webhook/import-specific behavior no longer has to masquerade as simulated polling;
- explicit callback/import reconciliation gives the platform a realistic bridge toward later external provider integrations without introducing a separate service or prematurely hardcoding one supplier vendor protocol.

## ADR-061 — Supplier Callback And Import Reconciliation Are Verified And Idempotent At The Inventory Boundary
Принято: transport-aware supplier reconciliation stays inside `PHASE 18` inventory boundary and does not introduce a separate inbox table yet. Webhook callbacks may require tenant/global secret-backed HMAC verification from `SecretRegistryEntry`; file-import reconciliation may require checksum verification; both paths are idempotent via explicit `deliveryId` / `importId` replay markers stored in replenishment workflow metadata and mirrored in `ConnectorExecutionLog`.
Причина:
- once inventory gained real webhook/import endpoints, leaving them as blind “operator callback” surfaces would have undermined the transport contract; verification had to become first-class before adding more provider-specific adapters;
- idempotency is required at this boundary even before a dedicated inbox/outbox layer exists, because supplier callbacks and file drops are the first truly replay-prone external signals in phase18 runtime;
- storing replay markers in replenishment workflow metadata is sufficient for current roadmap scope: it keeps verification local to the job lifecycle, preserves auditability in shared connector logs and avoids premature extra schema while still leaving room for a future inbox table if callback volume grows.

## ADR-062 — Supplier Reconciliation Failures And Operator Replays Must Survive Request Rollback
Принято: supplier webhook/import verification failures and operator replay intents are treated as operational state, not transient request-local details. Failure metadata for reconciliation is persisted outside the failing request transaction, and replay operations update replenishment workflow metadata plus `ConnectorExecutionLog` as explicit recovery artifacts.
Причина:
- once webhook/import verification started throwing `400` on invalid signature/checksum/reference, storing failure signals inside the same transaction would silently discard the exact information operators need to recover;
- keeping `lastFailure*` and replay state inside replenishment workflow metadata is enough for the current modular-monolith scope and avoids inventing a separate incident queue before real provider volumes justify it;
- explicit replay actions provide a pragmatic bridge between local recovery today and future scheduled retry orchestration or provider-specific dead-letter handling.

## ADR-063 — Supplier Retry Queueing Is Materialized In Inventory Workflow Metadata Before A Dedicated Scheduler Exists
Принято: retry orchestration for failed supplier reconciliation stays inside the inventory bounded context for now. Failed webhook/file-import jobs may be re-queued individually or via scope sweep; queueing sets `pendingCallback`/`pendingImport`, records `nextRetryAt`, increments retry counters and emits explicit retry queue execution logs, but does not yet require a separate queue service or worker fleet.
Причина:
- after failure persistence and manual replay were in place, the next operational gap was not another transport variation but the lack of a consistent “put this back into retry” path for operators or future cron-like automation;
- recording retry intent in replenishment workflow metadata keeps all supplier recovery state attached to the job lifecycle that actually owns it, while still giving enough information for a future scheduler/worker to pick up due retries;
- introducing a dedicated queue subsystem now would be premature for roadmap scope; queue artifacts plus explicit sweep endpoints provide the right contract without locking the platform into today’s inline execution model.

## ADR-064 — File-Import Supplier Connectors Use Explicit Pickup And Drop Endpoints Instead Of Only Raw Import Calls
Принято: `FILE_IMPORT` transport in inventory now exposes an explicit outbound pickup artifact and an inbound file-drop adapter. Supplier handoff materializes pickup/drop hints in workflow metadata and delivery artifact payload; dropped file content is parsed and normalized at the inventory boundary, then routed into the existing import reconciliation path with checksum derivation when required.
Причина:
- once file-import transport existed only as “handoff produced a file + operator later calls supplier-import”, the transport contract was still too abstract to resemble a real external exchange;
- explicit pickup/drop endpoints make the file path symmetrical with webhook transport: there is now a clear outbound artifact, a clear inbound adapter and shared reconciliation semantics behind both;
- keeping parsing/checksum derivation at the inventory boundary avoids spreading file-format knowledge into UI or test-only helpers and preserves one reconciliation path for duplicate handling, audit logging and retry orchestration.

## ADR-065 — Due Supplier Retries Are Dispatched Through An Inventory Runner Before A Separate Worker Exists
Принято: queued supplier retries do not remain passive metadata until an external scheduler is built. Inventory now exposes a due-retry runner that scans scoped replenishment jobs, picks `RETRY_QUEUED` entries whose `nextRetryAt` is due, moves them into `RETRY_DISPATCHED`, preserves pending transport state and logs the dispatch as a dedicated connector execution artifact.
Причина:
- once retry queueing existed, the remaining operational gap was the absence of any execution step between “queued” and “waiting for the next external signal”; that gap had to be closed before claiming worker-ready semantics;
- dispatching due retries inside the same inventory boundary keeps the state machine coherent and avoids duplicating retry eligibility rules in a future scheduler;
- an explicit runner endpoint is the smallest useful contract: today it can be invoked by operators or tests, and tomorrow it can be called by cron/worker infrastructure without changing reconciliation storage or transport semantics.

## ADR-066 — Inventory Retry Worker Hookup Is Env-Gated Inside The Modular Monolith
Принято: background execution for due supplier retries is now available directly inside the API runtime through `InventoryRetryWorkerService`, but remains disabled by default and fully controlled by environment variables. The worker owns only periodic invocation of the already existing due-retry runner and exposes status/last-result visibility through a dedicated read endpoint.
Причина:
- after the due-runner endpoint existed, the next practical step was not a separate service extraction but a minimal in-process hook that proves the contract can run unattended;
- keeping the worker env-gated avoids surprising current deployments and tests while still letting environments opt into periodic retry processing immediately;
- exposing status and last-result information makes the background loop observable enough for today’s modular monolith and reduces the risk of “hidden cron” behavior before a fuller job system is introduced.

## ADR-067 — Supplier Connectors May Use HTTP Push As A First-Class Transport Mode
Принято: phase18 inventory supplier runtime now treats `HTTP_PUSH` as a first-class transport mode alongside `SIMULATED`, `WEBHOOK` and `FILE_IMPORT`. Connector manifests may declare `endpoint`, `method` and polling semantics; handoff materializes an outbound request artifact preview and connector execution logs, while later status progression still uses the existing supplier sync path.
Причина:
- after webhook and file-import transports were covered, the remaining obvious gap was an active provider push path that does not depend on callbacks or file exchange;
- modeling `HTTP_PUSH` inside the same connector/transport contract lets the platform represent provider-style outbound delivery without yet committing to real network IO or a dedicated transport service;
- keeping status progression on the existing sync path preserves one reconciliation model and avoids introducing a second lifecycle just because the outbound delivery method changed.

## ADR-068 — HTTP Push Delivery Executes Inline Before A Dedicated Transport Worker Exists
Принято: `HTTP_PUSH` supplier handoff now performs an actual inline HTTP request during inventory handoff instead of staying a pure preview artifact. The runtime records response status/body or failure details back into the delivery artifact and connector execution log, while later supplier status progression still goes through the existing sync/reconciliation model.
Причина:
- once `HTTP_PUSH` existed only as metadata, it did not materially differ from a mock preview and did not prove that the transport contract could survive actual outbound IO;
- inline execution is the smallest useful way to validate provider-style delivery before extracting a separate transport worker or introducing a generic outbound job system;
- keeping response capture inside the existing handoff boundary preserves auditability and makes future auth/retry/error-policy work incremental rather than architectural.

## ADR-069 — HTTP Push Auth And Response Policy Stay Manifest-Driven
Принято: phase18 inventory keeps `HTTP_PUSH` auth and success policy inside connector manifest/runtime metadata instead of introducing a separate per-provider code path. Connectors may now declare auth mode (`BEARER|HEADER`), secret registry key, timeout, accepted HTTP statuses and response status mapping; runtime applies those policies during inline delivery and stores only redacted auth metadata in workflow artifacts/logs.
Причина:
- once outbound HTTP existed, the next real production gap was not another transport mode but per-connector delivery policy such as auth headers, timeout and non-200 acceptance semantics;
- keeping policy declarative in the connector manifest preserves one supplier transport contract across simulated, webhook, file and push flows instead of baking provider specifics into inventory service code;
- redacting auth metadata while resolving secret values from the shared secret registry keeps auditability and operator visibility without leaking credentials into replenishment workflow artifacts or connector logs.

## ADR-070 — Supplier Retry Lifecycle Is Manifest-Driven And Terminal State Is First-Class In The Operator UI
Принято: inventory supplier retry policy is not inferred from ad hoc UI actions. Connector registry cards may surface manifest-driven retry policy, replenishment job cards surface retry state and terminal/dead-letter markers, and terminal artifacts should not offer retry queueing as if they were still recoverable.
Причина:
- once transport-aware supplier execution and retry orchestration existed, the operator surface needed to reflect the actual state machine rather than only exposing a generic retry button;
- retry policy belongs to the connector manifest/runtime boundary, while retry state and dead-letter status belong to replenishment workflow state; keeping them separate avoids conflating policy with execution outcome;
- making terminal state visible and disabling queueing on exhausted artifacts reduces accidental operator actions and keeps the UI aligned with the recovery semantics already established in inventory runtime.

## ADR-071 — Supplier Operations Control Plane Stays Surface-First And Reuses Replenishment Jobs As The Queue Boundary
Принято: inventory does not introduce a separate operations model for retries, dead letters or worker control. The operator control plane reads from replenishment jobs, dead-letter listings and worker status endpoints, and exposes `run now`, `pause`, `resume` and `reopen` as thin controls over the same supplier workflow state machine.
Причина:
- the queue boundary is already represented by replenishment jobs and their workflow metadata, so duplicating it into a new console-specific state model would only add drift;
- surface-first controls keep operator intent visible without hiding the real runtime semantics behind a bespoke admin subsystem;
- this makes future backend worker/controller endpoints easy to align with the same UI contract while preserving one source of truth for dead-letter and retry state.

## ADR-072 — Supplier Provider Profiles Are Declarative Defaults And Operator-Visible Identity
Принято: inventory exposes supplier provider profiles as a dedicated read surface and surfaces provider-profile identity plus default-policy visibility on connector/job/dead-letter cards. Provider profiles are treated as declarative defaults, not as opaque runtime blobs hidden behind connector keys.
Причина:
- supplier connectors and replenishment jobs already act as the visible runtime boundary, so provider-profile identity has to appear where operators diagnose and select supplier behavior, not in a separate hidden config screen;
- declarative provider profiles make it possible to reason about default policy visibility and profile lineage independently from per-job reconciliation or transport mode;
- keeping the profile layer operator-visible but still declarative preserves the existing connector/job state machine while preparing the contract for later provider-specific execution work.

## ADR-073 — Supplier Provider Adapters Are Declarative Execution Profiles Layered On Top Of Provider Profiles
Принято: inventory exposes supplier provider adapters as a dedicated read surface and surfaces provider-adapter identity plus default-policy visibility on connector/job/dead-letter cards, separate from provider profiles. Provider adapters are treated as declarative execution defaults layered on top of provider-profile identity, not as hidden transport blobs inside connector manifests.
Причина:
- provider profiles describe reusable default policy and identity, while provider adapters describe the execution shape operators need to choose when a connector becomes provider-specific;
- adapter identity must remain visible in the same operator surfaces as jobs, dead letters and connector summaries so execution provenance stays explainable;
- keeping adapter and profile layers separate preserves a clean contract for later provider-specific runtime work without collapsing the two concepts into a single opaque config object.

## ADR-074 — Supplier Connector Readiness Is A Derived Onboarding Read Model
Принято: inventory exposes `supplier-connector-readiness` as a derived read model for onboarding. Readiness items carry `READY|BLOCKED|WARN`, checks, reasons and provider adapter/profile identity so the operator can see whether a connector is safe to hand off before execution starts. The readiness surface is computed from adapter/profile/secret policy; it is not the source of truth for connector state.
Причина:
- adapter/profile catalogs and live connector manifests already exist, so readiness should explain their combined effect rather than invent a separate onboarding source of truth;
- blocked reasons and checks need to be visible at operator time before handoff, but the actual handoff/reconciliation runtime still remains the authoritative state machine;
- keeping readiness as a derived read model lets the UI show onboarding health without coupling the operator surface to future transport/provider policy implementations.

## ADR-075 — Partner Onboarding Packages Are Issued From Distribution Requests And Remain Snapshot-Backed
Принято: partner onboarding for enterprise distribution is derived from `IntegrationDistributionRequest` rather than a separate portal-first model. `onboarding-readiness` and `onboarding-package` are snapshot-backed read surfaces that explain whether a request can be issued, which grant binding it received, and which package/docs URLs/checklist were materialized for the approved partner handoff.
Причина:
- public/published integration artifacts already exist, so partner onboarding should reuse the same distribution boundary instead of inventing a parallel partner portal state machine;
- onboarding needs to explain the handoff package, grant binding and readiness checks at operator time, but the request/gov/publication lifecycle remains the single source of truth;
- snapshot-backed onboarding packages keep the operator surface auditable and stable even if registry/template metadata changes later, while still leaving room for future partner federation or portal workflows.

## ADR-076 — Inventory Connector Activation Is A Derived Governance Layer Spanning Enterprise And Inventory
Принято: supplier connector activation is exposed as a derived governance/read layer that bridges `enterprise` and `inventory` instead of a new hidden runtime source of truth. `/enterprise` may surface activation requests and activation readiness, while `/inventory` surfaces activation state/readiness for connectors so operators can review rollout approval and runtime readiness together.
Причина:
- connector onboarding, publication, and runtime execution already live in separate bounded contexts, so activation governance should explain their combined effect rather than introduce a parallel state machine;
- activation approval needs to stay visible at operator time in `enterprise`, but `inventory` still remains authoritative for runtime readiness and execution provenance;
- keeping activation as a derived governance surface lets the UI evolve toward richer rollout controls later without coupling the current operator workspace to a new persistence boundary.

## ADR-077 — Activation Install Materializes Tenant Runtime Without A Separate Rollout Aggregate
Принято: enterprise activation requests may perform an explicit runtime install step that creates or updates a tenant-scoped supplier connector from registry/template/publication artifacts. This install step stays inside the activation-request lineage and writes install metadata into both `activationArtifact.runtimeInstall` and the installed connector manifest (`enterpriseRollout`) instead of introducing a new rollout table.
Причина:
- approval, apply, and install are separate operator actions, but they belong to one governance chain; a separate rollout aggregate would duplicate connector identity, target scope, and audit metadata already owned by activation requests;
- registry runtime manifests, connector templates, and publication artifacts already provide enough source material to derive tenant runtime without inventing another source of truth;
- inventory read models must prefer tenant-installed runtime connectors over global baselines for the same `connectorKey/version`, so install metadata has to travel with the connector manifest that inventory already consumes.

## ADR-078 — Provider Runtime Policy Is Shared, Strict In Enterprise And Warning-Visible In Inventory
Принято: supplier provider runtime policy is a shared catalog used by both `enterprise` activation/install governance and `inventory` connector readiness. The same policy keys/rules are exposed through dedicated catalog endpoints, but enforcement differs by boundary: `enterprise` evaluates provider policy in `STRICT` mode for activation/install/runtime-rollout readiness, while `inventory` evaluates it in `WARN_ONLY` mode so direct connectors can still be observed and handoff-tested without pretending they are fully rollout-backed.
Причина:
- provider adapters and provider profiles already form a shared supplier execution contract, so policy about publication snapshots, signatures, tenant install and governance drift must not fork into separate enterprise-vs-inventory rule sets;
- enterprise activation/install is the correct place for hard rollout enforcement because it owns publication provenance, approval state and tenant runtime materialization;
- inventory readiness still needs to surface the same policy debt to operators, but blocking every direct connector immediately would turn the shared policy layer into a migration breaker instead of an explainable rollout baseline.

## ADR-079 — Enterprise Execution Policy Gates External Provider Execution Before Runtime Install
Принято: enterprise activation/install flows must surface an explicit execution policy snapshot before any external provider runtime is installed or refreshed. The snapshot includes policy key, risk level, execution model, signed-publication requirement, tenant-install requirement and rollout governance, and it gates `install-runtime` / downstream provider execution actions.
Причина:
- activation governance already owns publication provenance and tenant runtime materialization, so external provider execution should be blocked or warned at the same boundary instead of being hidden inside inventory or registry pages;
- surfacing a policy snapshot makes provider execution explainable to operators before they commit to an install, avoiding silent rollout drift between registry metadata and runtime state;
- keeping the snapshot derived from the shared provider policy catalog preserves the strict/warn split already established in ADR-078 while giving enterprise a concrete gating surface for external provider execution.
