import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const workspaceRoot = join(appRoot, "../..");
const toolsPath = join(workspaceRoot, "tools");
const pnpmBin =
  process.platform === "win32"
    ? join(toolsPath, "pnpm.cmd")
    : join(toolsPath, "pnpm");
const shell = process.platform === "win32";

const workspaceEnvPath = join(workspaceRoot, ".env");
const appEnvPath = join(appRoot, ".env");

if (existsSync(workspaceEnvPath)) {
  process.loadEnvFile(workspaceEnvPath);
} else if (existsSync(appEnvPath)) {
  process.loadEnvFile(appEnvPath);
}

const sharedEnv = {
  ...process.env,
  PATH: `${toolsPath}${delimiter}${process.env.PATH ?? ""}`
};

const forwardedArgs = process.argv.slice(2);

await runCommand(["--filter", "@exetron/database", "db:deploy"], workspaceRoot);
await runCommand(
  ["exec", "jest", "--config", "./test/jest-e2e.json", "--runInBand", ...forwardedArgs],
  appRoot
);

async function runCommand(args, cwd) {
  const exitCode = await new Promise((resolve) => {
    const child = spawn(pnpmBin, args, {
      cwd,
      env: sharedEnv,
      stdio: "inherit",
      shell
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
