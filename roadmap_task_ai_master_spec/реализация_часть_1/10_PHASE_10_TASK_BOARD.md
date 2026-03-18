# PHASE 10 Task Board

## Phase
PHASE 10

## Goal
Подготовить систему к production-нагрузке и росту через runtime hardening, observability, CI/CD gates и operational documentation.

## Scope
- test coverage for critical flows
- observability
- error handling
- deployment strategy
- migrations strategy
- rollback strategy
- performance review
- security review

## Deliverables
- expanded CI/CD pipeline
- structured JSON logs
- liveness/readiness/metrics endpoints
- standardized error envelopes with request ids
- migration safety checklist
- performance review note
- security hardening list
- production readiness doc

## Tasks
- [x] Уточнить scope этапа
- [x] Уточнить deliverables этапа
- [x] Добавить structured logging и request ids в API runtime
- [x] Добавить liveness/readiness/metrics endpoints
- [x] Добавить standardized error envelope и exception metrics
- [x] Расширить GitHub Actions до build + live Postgres e2e + artifact packaging
- [x] Зафиксировать critical flow gate через `test:critical`
- [x] Добавить PHASE 10 e2e на health/readiness/metrics/error envelope
- [x] Подготовить migration/rollback/performance/security docs
- [x] Обновить progress tracker, ADR, README и architecture docs

## Done
- Реализован observability слой:
  - `JsonLoggerService`
  - request id middleware
  - request logging interceptor
  - global exception filter
  - in-memory metrics service
- API расширен endpoint'ами:
  - `GET /health`
  - `GET /health/live`
  - `GET /health/readiness`
  - `GET /health/metrics`
- Добавлен root script `test:critical`
- GitHub Actions CI расширен до:
  - lint
  - typecheck
  - unit tests
  - build
  - live Postgres e2e
  - release artifact packaging on protected branches
- Добавлен e2e сценарий `phase10-hardening.e2e-spec.ts`
- Web lint pipeline переведен на ESLint CLI с Next `core-web-vitals` config; warning по deprecated `next lint` убран
- Workspace `turbo` test tasks приведены к `outputs: []`, чтобы verification pipeline не шумел ложным warning про отсутствующие coverage artifacts
- Добавлены docs:
  - `docs/operations/production-readiness.md`
  - `docs/operations/migration-safety-checklist.md`
  - `docs/operations/performance-review.md`
  - `docs/operations/security-hardening.md`

## In Progress
- _пусто_

## Blocked
- _пусто_

## Next
- Зафиксировать post-phase backlog после PHASE 10
- При необходимости вынести observability в external stack: Prometheus/Grafana/OpenTelemetry
- Определить roadmap после initial implementation pack
