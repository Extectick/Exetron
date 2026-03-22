# PHASE 18 Task Board

## Phase
`PHASE 18`

## Wave
`WAVE 6 — Inventory & Supply Flows`

## Goal
Добавить inventory and supply depth через stock, movements, warehouse-lite, ingredient stock, stop-list automation, receiving и stock-aware ordering.

## Status
`Completed`

## Dependencies
- `PHASE 14` and `PHASE 15`
- catalog, orders, kitchen routing, analytics

## Completed Work Reused
- catalog and modifiers
- orders and checkout lifecycle
- kitchen routing basics
- analytics patterns for operational summaries

---

# Epic 1 — Domain & Data
## Tasks
- [x] Определить stock and movement ledger model
- [x] Определить warehouse-lite and supply receiving entities
- [x] Определить ingredient stock, stop-list automation and stock-aware ordering rules

## Deliverables
- stock/movement model
- warehouse-lite/receiving model
- ingredient/stop-list/stock-aware ordering model

## Acceptance
- [x] Stock model согласован с catalog composition and order consumption
- [x] Receiving and movement entities отделены от general order lifecycle

## Notes/Risks
- риск смешать lightweight inventory with full ERP scope
- риск не определить relation between product stock and ingredient stock

---

# Epic 2 — Runtime & API
## Tasks
- [x] Определить stock mutation runtime and receiving flow
- [x] Определить stop-list automation runtime
- [x] Определить stock-aware ordering checks

## Deliverables
- stock mutation runtime contract
- stop-list automation contract
- stock-aware ordering runtime contract

## Acceptance
- [x] Stock changes имеют явный event or transaction path
- [x] Order acceptance policy учитывает stock constraints без channel forks

## Notes/Risks
- риск сделать stock checks только для одного канала
- риск не определить reconciliation between manual and automated stock updates

---

# Epic 3 — UI/Channel Surfaces
## Tasks
- [x] Определить operator surfaces для stock visibility and receiving
- [x] Определить kitchen-facing or store-facing touchpoints для stop-list visibility
- [x] Определить owner-facing summaries для inventory health

## Deliverables
- inventory UI scope
- stop-list visibility touchpoints
- inventory summary visibility requirements

## Acceptance
- [x] Понятны operational surfaces для receiving and stock corrections
- [x] Stop-list visibility совместима с existing channel shells

## Notes/Risks
- риск смешать inventory dashboards с general analytics
- риск не охватить device-facing operational needs

---

# Epic 4 — Integrations/Security/Async
## Tasks
- [x] Определить async recalculation boundary для stop-list and availability updates
- [x] Определить security and approval policy для manual stock adjustments
- [x] Определить extension points для future ERP or supplier integrations without реализовывать их сейчас

## Deliverables
- inventory async boundary
- stock adjustment security policy
- ERP/supplier extension points

## Acceptance
- [x] Async boundary покрывает propagation of stock changes
- [x] Manual stock adjustments audit-friendly и совместимы с existing permissions model

## Notes/Risks
- риск пропустить race conditions around simultaneous stock mutations
- риск перенести supplier integration scope из будущих ecosystem tasks

---

# Epic 5 — Tests/Docs/Ops
## Tasks
- [x] Зафиксировать acceptance scenarios для stock, receiving, ingredient inventory, stop-list and stock-aware ordering
- [x] Обновить tracker после первых inventory deliverables
- [x] Добавить ADR при изменении inventory boundary or ordering policy

## Deliverables
- inventory acceptance checklist
- tracker updates
- ADR if needed

## Acceptance
- [x] Все backlog items PHASE 18 покрыты только в этой фазе
- [x] Документы позволяют наращивать inventory depth ступенчато

## Notes/Risks
- риск не описать negative stock and recovery cases
- риск недооценить ties between inventory and promotions or fulfillment promises

---

## Done
- inventory runtime выделен в отдельный bounded context `inventory` с warehouses, ingredients, stock items, recipe BOM, receiving, adjustments, reservations, ledger и stop-list rules
- availability считается как `onHand - reserved`; receiving и manual adjustments пишут inventory ledger, а stop-list rules и low-stock visibility доступны в overview API
- order checkout теперь резервирует stock при наличии inventory/BOM config, cancellation release reservations, completion consumes them
- post-roadmap hardening: reservation planning/release/consume semantics вынесены из `OrdersModule` в `InventoryService`, поэтому order runtime больше не зависит напрямую от raw inventory SQL
- post-roadmap hardening: inventory CRUD/runtime переведен на Prisma-backed access поверх mapped `inventory_*` tables; phase18 storage теперь typed and schema-backed
- forward-only Prisma migration `20260319203427_phase16_20_storage_consolidation` теперь регистрирует `inventory_*` tables/indexes/RLS; migration history больше не отстает от фактического runtime
- post-migration cleanup: phase18 runtime bootstrap DDL удален; inventory module теперь поднимается только на migration-applied schema
- post-roadmap hardening: physical normalization закрыт без runtime fork — `inventory_*` tables переведены на UUID-backed columns и database-level FKs к core/inventory entities через migration `20260319235500_phase18_inventory_uuid_normalization`
- добавлена admin surface `/inventory`, permissions `inventory.read/write` и e2e `phase18-inventory`; post-roadmap UX wave уже перевела страницу с thin console в task-oriented inventory workspace для warehouse/receiving/reservation/stop-list workflows
- post-roadmap reporting wave: добавлен endpoint `GET /inventory/operations-overview`, который собирает KPI/status/latest snapshot по warehouses, stock items, receivings, reservations, stop-list rules и ledger; `/inventory` использует его для operational snapshot
- reporting depth расширен до operator actions: добавлены `GET /inventory/replenishment-report` и `GET /inventory/ledger-drilldown`, чтобы `/inventory` мог показывать restock recommendations, movement totals/by-entry-type breakdown и recent ledger entries по текущему scope
- replenishment/reporting wave доведена до persisted artifacts: добавлены table-backed `InventoryReplenishmentJob`, migration `20260321093000_phase18_replenishment_jobs`, API `GET/POST /inventory/replenishment-jobs`, `GET /inventory/replenishment-jobs/:id`, `POST /inventory/replenishment-jobs/:id/archive` и inventory UI для сохранения/просмотра/archive generated replenishment batches
- operator execution layer поверх replenishment artifacts уже добавлен: `POST /inventory/replenishment-jobs/:id/approve`, `POST /inventory/replenishment-jobs/:id/dispatch`, `GET /inventory/replenishment-jobs/:id/export` формализуют `GENERATED -> APPROVED -> DISPATCHED` flow и дают CSV-style export artifact прямо из persisted replenishment job
- receive-against-job reconciliation уже добавлен: `POST /inventory/replenishment-jobs/:id/receive` materializes linked `ReceivingRecord` из dispatched replenishment job, проводит stock delta через existing receiving completion path и записывает receipt linkage/status обратно в job workflow metadata
- supplier-facing execution layer углублен без новой schema wave: `POST /inventory/replenishment-jobs/:id/handoff` и `POST /inventory/replenishment-jobs/:id/supplier-status` теперь хранят supplier name/reference/channel/status sync в workflow metadata, а export path поддерживает уже не только inline CSV, но и JSON artifact через `GET /inventory/replenishment-jobs/:id/export?format=json`
- shared connector runtime reuse уже добавлен: `GET /inventory/supplier-connectors` читает active entries из enterprise integration registry, handoff/status sync могут идти через `connectorKey`, supplier connector simulator пишет `ConnectorExecutionLog`, а `POST /inventory/replenishment-jobs/:id/supplier-sync` и `GET /inventory/replenishment-jobs/:id/connector-executions` дают phase18 первый concrete consumer для registry/connector foundations без новой storage fork
- next supplier runtime slice уже материализован поверх того же foundation: connector manifest теперь может задавать transport mode `SIMULATED|WEBHOOK|FILE_IMPORT`, `POST /inventory/replenishment-jobs/:id/handoff` учитывает transport-aware delivery path, а новые endpoints `POST /inventory/replenishment-jobs/:id/supplier-webhook` и `POST /inventory/replenishment-jobs/:id/supplier-import` проводят normalized callback/import reconciliation с записью в shared `ConnectorExecutionLog`; `/inventory` показывает transport state и operator actions для webhook/import completion
- supplier callback/import hardening закрыт без новой inbox schema wave: webhook path теперь поддерживает secret-backed HMAC verification, file-import path поддерживает checksum verification, оба пути стали idempotent по `deliveryId/importId`, пишут replay markers/reconciliation metadata в replenishment workflow и остаются traceable через shared `ConnectorExecutionLog`
- recovery loop поверх supplier reconciliation тоже добавлен: failed webhook/import verification теперь сохраняет `lastFailure*` metadata вне rollback path, `POST /inventory/replenishment-jobs/:id/supplier-replay` дает operator-triggered replay для verified webhook/file-import state, а `/inventory` показывает failure/replay counters прямо на replenishment job cards
- retry orchestration поверх recovery loop тоже добавлен: `POST /inventory/replenishment-jobs/:id/supplier-retry-queue` и `POST /inventory/replenishment-jobs/supplier-retry-sweep` переводят failed webhook/file-import jobs обратно в pending state с `nextRetryAt/retryAttemptCount`, пишут retry queue artifacts в workflow metadata и дают inventory workable bridge к будущему scheduler без отдельного queue service
- file-import transport больше не абстрактный import-only contract: `GET /inventory/replenishment-jobs/:id/supplier-file-pickup` выдает outbound supplier artifact с pickup/drop hints, а `POST /inventory/replenishment-jobs/:id/supplier-file-drop` парсит dropped file content, при необходимости сам вычисляет checksum и маршрутизирует его в existing import reconciliation path
- time-driven retry execution тоже материализован без отдельного worker process: `POST /inventory/replenishment-jobs/supplier-retry-run-due` поднимает due `RETRY_QUEUED` jobs в `RETRY_DISPATCHED`, фиксирует `lastRetryProcessed*`/`retryProcessedCount` и дает готовый contract для будущего cron/worker orchestration поверх уже существующего inventory boundary
- worker hookup теперь тоже есть в самом API runtime: `InventoryRetryWorkerService` поднимает env-gated background loop для due supplier retries, `/inventory/supplier-retry-worker-status` отдает runtime status/config/last result, а `/inventory` показывает worker visibility без обязательного включения background processing по умолчанию
- transport matrix расширен до provider-style outbound API delivery: supplier connectors теперь поддерживают `HTTP_PUSH` handoff mode с manifest-driven `endpoint/method`, request artifact preview и обычным polling-based `supplier-sync`, так что phase18 уже покрывает не только callback/import transports, но и active push-to-provider path
- `HTTP_PUSH` path больше не transport preview only: inventory handoff теперь реально выполняет inline HTTP request к connector endpoint, пишет response status/body в delivery artifact и `ConnectorExecutionLog`, а локальный provider mock в e2e подтверждает, что outbound request действительно уходит за пределы inventory runtime
- `HTTP_PUSH` quality wave тоже закрыта внутри того же boundary: connector manifest теперь может задавать secret-backed auth policy (`BEARER|HEADER`), `timeoutMs`, `acceptedStatusCodes` и `responseStatusField/responseStatusMap`, runtime применяет redacted auth metadata без утечки secret values, а e2e покрывает и успешный authenticated handoff, и rejected response policy path
- supplier retry lifecycle теперь тоже виден в operator workspace: `/inventory` показывает manifest-driven retry policy по connector registry entries, retry state/terminal/dead-letter markers по replenishment jobs и disables retry queueing on terminal artifacts instead of hiding these states behind raw reconciliation metadata
- supplier operations control plane теперь собран поверх того же runtime: `/inventory` показывает supplier operations overview KPIs, dead-letter queue, retry worker status и worker controls (`run now/pause/resume`) как отдельный operator block, а dead-letter artifacts можно reopen прямо из queue surface
- inventory supplier provider-profile block теперь surfaced in the same workspace: `/inventory` показывает available provider profiles, profile identity и default-policy visibility на connector/job/dead-letter surfaces
- inventory supplier provider-adapter block теперь surfaced in the same workspace: `/inventory` показывает available provider adapters, adapter identity и default-policy visibility на connector/job/dead-letter surfaces, separate from provider profiles
- provider-runtime-policy compatibility layer теперь materialized поверх adapter/profile catalogs: `GET /inventory/supplier-provider-policies` отдает explicit policy catalog, `/inventory` показывает policy risk/execution/distribution baseline, а supplier connector readiness surface теперь несет `providerPolicy/providerPolicySummary` so provider-governed direct connectors become `WARN` instead of pretending they are fully rollout-backed
- inventory supplier connector readiness block теперь surfaced in the same workspace: `/inventory` показывает onboarding/readiness summary, blocked reasons/checks, selected connector readiness summary и readiness labels на connector list surfaces, чтобы operator мог отличать READY/BLOCKED/WARN before handoff
- inventory activation state now surfaced alongside readiness: `/inventory` also shows activation state and activation readiness for supplier connectors, so operators can distinguish a merely ready connector from one that is actually approved for downstream rollout
- inventory connector visibility теперь следует rollout boundary: read models dedupe global and tenant-scoped supplier connectors by `connectorKey/version`, so tenant-installed runtime connectors shadow global baselines instead of appearing as duplicate operator choices
- provider runtime overview now surfaced in the same workspace: `/inventory` summarizes provider runtime policies, adapters, profiles, connector readiness counts and provider-specific execution classes, while replenishment jobs show per-job supplier execution readiness plus provider-specific failure/retry classes

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- сохранить current reservation/release/consume policy без channel-specific inventory forks
- развивать `/inventory` только через richer operator workflows и reporting depth, а не через возврат к schema rescue work
- следующая волна для `inventory` уже не generic transport hardening, а provider-specific execution and rollout depth поверх нового provider-policy baseline: реальные supplier adapters, richer timeout/backoff profiles per provider, external file providers, rollout/install policy hooks и/или внешний scheduler deployment policy поверх текущего verified/replayable connector contract

## Phase Exit Summary
- [x] Stock and movements определены
- [x] Warehouse-lite определен
- [x] Ingredient stock определен
- [x] Stop-list automation определена
- [x] Supply receiving and stock-aware ordering определены
- [x] Progress tracker обновлен
