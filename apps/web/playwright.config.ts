import path from "node:path";
import { defineConfig } from "@playwright/test";

const workspaceRoot = path.resolve(__dirname, "../..");
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? "3200";
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "3201";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/dev.mjs",
    cwd: workspaceRoot,
    url: `http://127.0.0.1:${webPort}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: apiPort,
      WEB_PORT: webPort,
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
      EXPO_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`
    }
  }
});
