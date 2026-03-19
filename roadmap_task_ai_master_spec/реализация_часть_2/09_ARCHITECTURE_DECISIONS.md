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
