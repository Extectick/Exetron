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
const buildOutput = join(appRoot, "dist", "apps", "api", "src", "main.js");
const children = [];
let shuttingDown = false;

const sharedEnv = {
  ...process.env,
  PATH: `${toolsPath}${delimiter}${process.env.PATH ?? ""}`
};

await runCommand(["--filter", "@exetron/config", "build"], workspaceRoot);
await runCommand(["--filter", "@exetron/database", "build"], workspaceRoot);
await runCommand(["build"], appRoot);

startProcess(
  "api-builder",
  ["exec", "nest", "build", "--watch", "--path", "tsconfig.build.json", "--preserveWatchOutput"],
  appRoot
);

await waitForFile(buildOutput);

startProcess(
  "api-runner",
  [
    "exec",
    "node",
    "--watch",
    "--watch-path",
    "dist/apps/api/src",
    "--watch-path",
    "../../packages/config/dist",
    "--watch-path",
    "../../packages/database/dist",
    "dist/apps/api/src/main.js"
  ],
  appRoot
);

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

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

function startProcess(name, args, cwd) {
  const child = spawn(pnpmBin, args, {
    cwd,
    env: sharedEnv,
    stdio: "inherit",
    shell
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = code ?? (signal ? 1 : 0);
    console.error(
      `[api-dev] ${name} exited${signal ? ` with signal ${signal}` : ` with code ${exitCode}`}.`
    );
    void shutdown(exitCode === 0 ? 1 : exitCode);
  });
}

async function waitForFile(filePath) {
  const startedAt = Date.now();

  while (!existsSync(filePath)) {
    if (Date.now() - startedAt > 60_000) {
      throw new Error(`Timed out waiting for build output: ${filePath}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await Promise.all(children.map((child) => terminateChild(child)));
  process.exit(exitCode);
}

function terminateChild(child) {
  return new Promise((resolve) => {
    if (!child.pid || child.exitCode !== null) {
      resolve();
      return;
    }

    child.once("exit", () => resolve());

    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", `${child.pid}`, "/t", "/f"], {
        stdio: "ignore",
        shell: true
      });

      killer.once("exit", () => resolve());
      return;
    }

    child.kill("SIGINT");
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
      }
    }, 1_000);
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 3_000);
  });
}
