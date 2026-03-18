# Performance Review

## Current Hot Paths

- compiled catalog generation
- pricing preview during cart edits
- cart checkout to order snapshot copy
- payment allocation processing
- kitchen board aggregation
- owner cabinet analytics aggregation

## Baseline Review For PHASE 10

- API critical flows pass under live e2e on Dockerized Postgres.
- Read-heavy analytics still run on transactional tables and remain the biggest future scaling pressure.
- Catalog compilation and owner cabinet aggregation are synchronous and should be watched first under real tenant growth.
- Web and API production builds complete successfully in CI and local verification.

## Next Scaling Triggers

Introduce dedicated optimization work when any of these happen:
- owner cabinet queries become slow under real history volume
- compiled catalog generation becomes a bottleneck for many POS/kiosk devices
- kitchen board needs replay/history beyond current websocket rooms
- payment reconciliation summaries need longer historical windows

## Planned Response

- add materialized or precomputed analytics read models
- cache compiled catalog per `tenant + store + price configuration`
- add targeted database indexes based on production traces
- move selected heavy aggregates to background snapshot generation
