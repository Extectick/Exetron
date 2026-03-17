import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { PrismaClient } from "../generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const envCandidates = [
  join(process.cwd(), ".env"),
  join(process.cwd(), "../../.env"),
  join(process.cwd(), "../../../.env")
];

for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

export function createPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["warn", "error"]
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = createPrismaClient();
