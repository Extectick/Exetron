import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { defineConfig } from "prisma/config";

const workspaceEnvPath = join(process.cwd(), "../../.env");
const localEnvPath = join(process.cwd(), ".env");

if (existsSync(workspaceEnvPath)) {
  process.loadEnvFile(workspaceEnvPath);
} else if (existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  }
});
