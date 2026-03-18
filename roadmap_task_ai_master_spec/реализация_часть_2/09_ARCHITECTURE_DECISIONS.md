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
