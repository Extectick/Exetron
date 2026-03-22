import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

const packageRoot = process.cwd();
const sourceDir = join(packageRoot, "generated", "client");
const targetDir = join(packageRoot, "dist", "database", "generated", "client");
if (!existsSync(sourceDir)) {
  throw new Error(
    "Prisma generated client was not found. Run `corepack pnpm db:generate` before building @exetron/database."
  );
}

if (existsSync(targetDir)) {
  rmSync(targetDir, { force: true, recursive: true });
}

mkdirSync(dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { force: true, recursive: true });
