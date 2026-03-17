# Local Development

## Prerequisites

- Node.js 22+
- `corepack`
- Docker Desktop or another Docker daemon

## Commands

- `corepack pnpm install`
- `corepack pnpm infra:up`
- `corepack pnpm db:generate`
- `corepack pnpm db:deploy`
- `corepack pnpm db:seed`
- `corepack pnpm dev`

## Notes

- Root scripts use a repo-local `turbo` launcher plus a local `pnpm` shim so the
  workspace still runs correctly when `pnpm` is only available through `corepack`.
- Project Postgres is published on `localhost:5433` to avoid conflicts with local
  host PostgreSQL instances.
- For new schema work, use `corepack pnpm --filter @exetron/database db:migrate -- --name <migration_name>`.
- Live Docker runtime verification, API smoke e2e and workspace build/test/typecheck
  are already passing in this repository state.
