import { loadApiEnv } from "@exetron/config";
import { permissionSeed, prisma } from "@exetron/database";
import bcrypt from "bcryptjs";

export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'"
  );

  if (!tables.length) {
    return;
  }

  const qualifiedNames = tables
    .map((table) => `"public"."${table.tablename.replaceAll('"', '""')}"`)
    .join(", ");

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${qualifiedNames} RESTART IDENTITY CASCADE`
  );
}

export async function seedPlatformAdmin(): Promise<void> {
  const env = loadApiEnv(process.env);
  const passwordHash = await bcrypt.hash(env.PLATFORM_ADMIN_PASSWORD, 10);

  for (const permission of permissionSeed) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: permission,
      create: permission
    });
  }

  await prisma.user.upsert({
    where: { email: env.PLATFORM_ADMIN_EMAIL },
    update: {
      firstName: "Platform",
      lastName: "Admin",
      passwordHash,
      isPlatformAdmin: true,
      status: "ACTIVE"
    },
    create: {
      email: env.PLATFORM_ADMIN_EMAIL,
      firstName: "Platform",
      lastName: "Admin",
      passwordHash,
      isPlatformAdmin: true,
      status: "ACTIVE"
    }
  });
}
