import { expect, test } from "@playwright/test";
import { bootstrapAdminSession, expectDashboardSession } from "./test-helpers";

test("guest users are redirected to login for protected pages", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to Admin" })).toBeVisible();
});

test("platform admin session can reach dashboard and sign out", async ({ page }) => {
  await bootstrapAdminSession(page);
  await expectDashboardSession(page);

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/);
});
