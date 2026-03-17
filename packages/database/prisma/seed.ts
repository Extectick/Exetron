import { loadApiEnv } from "@exetron/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma.js";
import { permissionSeed } from "../src/seeds.js";

async function main() {
  const env = loadApiEnv(process.env);

  for (const permission of permissionSeed) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: permission,
      create: permission
    });
  }

  const passwordHash = await bcrypt.hash(env.PLATFORM_ADMIN_PASSWORD, 10);

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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
