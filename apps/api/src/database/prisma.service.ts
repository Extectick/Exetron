import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@exetron/database";

function resolveMigrationsDir(): string | null {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "packages", "database", "prisma", "migrations"),
    join(cwd, "..", "packages", "database", "prisma", "migrations"),
    join(cwd, "..", "..", "packages", "database", "prisma", "migrations"),
    join(cwd, "database", "prisma", "migrations")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveLatestMigrationName(): string | null {
  const migrationsDir = resolveMigrationsDir();

  if (!migrationsDir) {
    return null;
  }

  const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return migrationNames.at(-1) ?? null;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.assertMigrationsAreCurrent();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private async assertMigrationsAreCurrent(): Promise<void> {
    const expectedMigration = resolveLatestMigrationName();

    if (!expectedMigration) {
      return;
    }

    try {
      const rows = await this.$queryRawUnsafe<Array<{ migration_name: string }>>(
        'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL ORDER BY "finished_at" DESC, "migration_name" DESC LIMIT 1'
      );
      const appliedMigration = rows[0]?.migration_name ?? null;

      if (appliedMigration !== expectedMigration) {
        throw new Error(
          `Database schema is not up to date. Expected latest migration "${expectedMigration}", got "${appliedMigration ?? "none"}". Run "pnpm db:deploy" before starting the API.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Database migrations check failed. Run "pnpm db:deploy" before starting the API. ${message}`
      );
    }
  }
}
