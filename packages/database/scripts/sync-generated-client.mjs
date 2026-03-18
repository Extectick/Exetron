import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

const packageRoot = process.cwd();
const sourceDir = join(packageRoot, "generated", "client");
const targetDir = join(packageRoot, "dist", "database", "generated", "client");
const targetEntry = join(targetDir, "index.js");

if (!existsSync(sourceDir)) {
  throw new Error(
    "Prisma generated client was not found. Run `corepack pnpm db:generate` before building @exetron/database."
  );
}

if (existsSync(targetEntry)) {
  process.exit(0);
}

mkdirSync(dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { force: true, recursive: true });
