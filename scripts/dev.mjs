import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { delimiter, join } from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const toolsPath = join(workspaceRoot, "tools");
const pnpmBin =
  process.platform === "win32"
    ? join(toolsPath, "pnpm.cmd")
    : join(toolsPath, "pnpm");
const shell = process.platform === "win32";

loadEnvFiles([".env", ".env.local"]);

const argv = new Set(process.argv.slice(2));
const includeMobile = argv.has("--mobile") || argv.has("--all");
const mobileOnly = argv.has("--mobile-only");
const shouldStartApiAndWeb = !mobileOnly;
const reservedPorts = new Set();

const requestedApiPort = parsePort(process.env.PORT, 3001);
const requestedWebPort = parsePort(process.env.WEB_PORT, 3000);
const requestedMobilePort = parsePort(process.env.EXPO_DEV_PORT, 8081);

const apiPort = shouldStartApiAndWeb
  ? await findAvailablePort(requestedApiPort, reservedPorts)
  : requestedApiPort;
const webPort = shouldStartApiAndWeb
  ? await findAvailablePort(requestedWebPort, reservedPorts)
  : requestedWebPort;
const defaultApiUrl = `http://localhost:${apiPort}`;
const apiUrl = shouldStartApiAndWeb
  ? defaultApiUrl
  : process.env.EXPO_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    defaultApiUrl;
const mobilePort =
  includeMobile || mobileOnly
    ? await findAvailablePort(requestedMobilePort, reservedPorts)
    : requestedMobilePort;

const managedEnv = {
  ...process.env,
  PATH: `${toolsPath}${delimiter}${process.env.PATH ?? ""}`,
  PORT: `${apiPort}`,
  WEB_PORT: `${webPort}`,
  EXPO_DEV_PORT: `${mobilePort}`,
  NEXT_PUBLIC_API_URL: apiUrl,
  EXPO_PUBLIC_API_URL: apiUrl
};

const children = [];
let shuttingDown = false;

if (shouldStartApiAndWeb) {
  printPortMessage("api", requestedApiPort, apiPort);
  printPortMessage("web", requestedWebPort, webPort);
}

if (includeMobile || mobileOnly) {
  printPortMessage("mobile", requestedMobilePort, mobilePort);
}

if (!includeMobile && !mobileOnly) {
  console.log(
    "[dev] Starting api + web. Use `corepack pnpm dev:mobile` to run Expo separately."
  );
}

if (shouldStartApiAndWeb) {
  startProcess("api", ["--filter", "@exetron/api", "dev"]);
  startProcess("web", [
    "--filter",
    "@exetron/web",
    "exec",
    "next",
    "dev",
    "--port",
    `${webPort}`
  ]);
}

if (includeMobile || mobileOnly) {
  startProcess("mobile", [
    "--filter",
    "@exetron/mobile",
    "exec",
    "expo",
    "start",
    "--port",
    `${mobilePort}`,
    "--localhost"
  ]);
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

function loadEnvFiles(files) {
  for (const file of files) {
    const candidate = join(workspaceRoot, file);

    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
    }
  }
}

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function findAvailablePort(startPort, reserved) {
  let port = startPort;

  while (reserved.has(port) || !(await isPortAvailable(port))) {
    port += 1;
  }

  reserved.add(port);
  return port;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.once("error", () => {
      resolve(false);
    });
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

function printPortMessage(name, requestedPort, actualPort) {
  if (requestedPort === actualPort) {
    console.log(`[dev] ${name} will use port ${actualPort}.`);
    return;
  }

  console.log(
    `[dev] ${name} requested port ${requestedPort}, using ${actualPort} because the requested port is busy.`
  );
}

function startProcess(name, args) {
  const child = spawn(pnpmBin, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    shell,
    env: managedEnv
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const exitCode = code ?? (signal ? 1 : 0);
    console.error(
      `[dev] ${name} exited${signal ? ` with signal ${signal}` : ` with code ${exitCode}`}.`
    );
    void shutdown(exitCode === 0 ? 1 : exitCode);
  });
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
