import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const sessionStorageKey = "exetron.admin.session";

function readAdminSession() {
  const sessionPath = path.resolve(__dirname, ".auth", "admin-session.json");
  return JSON.parse(fs.readFileSync(sessionPath, "utf8")) as Record<string, unknown>;
}

export async function bootstrapAdminSession(page: Page) {
  const session = readAdminSession();

  await page.addInitScript(
    ({ key, storedSession }) => {
      window.localStorage.setItem(key, JSON.stringify(storedSession));
    },
    {
      key: sessionStorageKey,
      storedSession: session
    }
  );
}

export async function expectDashboardSession(page: Page) {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Admin Control Plane")).toBeVisible();
}
