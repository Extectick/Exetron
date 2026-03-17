# Exetron

Exetron is a multi-tenant SaaS platform for offline business automation. This
repository implements the `PHASE 0 -> PHASE 2` plan from
`roadmap_task_ai_master_spec`.

## Workspace

- `apps/api` - NestJS modular monolith and platform core REST API
- `apps/web` - Next.js admin control plane
- `apps/mobile` - Expo scaffold for future POS and kiosk flows
- `packages/config` - shared environment contracts
- `packages/contracts` - shared DTO and API shapes
- `packages/database` - Prisma schema, migrations, generated client, seed data
- `packages/types` - shared primitive types and request context
- `roadmap_task_ai_master_spec` - source of truth for planning and progress notes

## Quick Start

1. Copy `.env.example` to `.env`.
2. Ensure Docker Desktop is running.
3. Run `corepack pnpm install`.
4. Run `corepack pnpm infra:up`.
5. Run `corepack pnpm db:generate`.
6. Run `corepack pnpm db:deploy` for existing migrations, or `corepack pnpm --filter @exetron/database db:migrate -- --name <migration_name>` while developing new schema changes.
7. Run `corepack pnpm db:seed`.
8. Run `corepack pnpm dev`.

## Verification

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm test:e2e`
- `corepack pnpm build`

Dockerized runtime verification is working with project Postgres on
`localhost:5433`. API unit tests, live Postgres e2e smoke, workspace lint,
typecheck, test and build all pass.
