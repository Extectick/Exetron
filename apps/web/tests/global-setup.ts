import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { loadApiEnv } from "@exetron/config";
import { permissionSeed, prisma } from "@exetron/database";

function loadEnvIfPresent(filePath: string) {
  if (existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

export default async function globalSetup() {
  const workspaceRoot = path.resolve(process.cwd(), "../..");
  loadEnvIfPresent(path.join(workspaceRoot, ".env"));
  loadEnvIfPresent(path.join(workspaceRoot, ".env.local"));

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

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: env.PLATFORM_ADMIN_EMAIL },
    select: {
      id: true,
      tenantId: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      isPlatformAdmin: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const accessToken = jwt.sign(
    {
      sub: adminUser.id,
      tenantId: adminUser.tenantId,
      scope: "platform_admin",
      roleIds: [],
      storeIds: []
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"]
    }
  );
  const refreshToken = jwt.sign(
    {
      sub: adminUser.id,
      sid: crypto.randomUUID(),
      typ: "refresh"
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"]
    }
  );

  const authDir = path.join(process.cwd(), "tests", ".auth");
  await mkdir(authDir, { recursive: true });
  await writeFile(
    path.join(authDir, "admin-session.json"),
    JSON.stringify(
      {
        accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_TTL,
        refreshExpiresIn: env.JWT_REFRESH_TTL,
        me: {
          user: {
            id: adminUser.id,
            tenantId: adminUser.tenantId,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            status: adminUser.status,
            isPlatformAdmin: adminUser.isPlatformAdmin,
            roleIds: [],
            storeIds: [],
            createdAt: adminUser.createdAt.toISOString(),
            updatedAt: adminUser.updatedAt.toISOString()
          },
          claims: {
            sub: adminUser.id,
            tenantId: adminUser.tenantId,
            scope: "platform_admin",
            roleIds: [],
            storeIds: []
          },
          permissions: []
        }
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}
