import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { bootstrapAdminSession, expectDashboardSession } from "./test-helpers";

function pageHeading(page: Page, name: string) {
  return page.locator(".panel-header h2").filter({ hasText: name }).first();
}

function sidebarGroup(page: Page, name: string) {
  return page.locator(".ex-admin-sider").getByText(name, { exact: true }).first();
}

async function signIn(page: Page) {
  await bootstrapAdminSession(page);
  await expectDashboardSession(page);
}

async function createTenant(page: Page) {
  const unique = randomUUID().slice(0, 8);
  const slug = `pw-${unique}`;
  const name = `Playwright ${unique}`;

  await page.goto("/tenants");
  await expect(pageHeading(page, "Tenants")).toBeVisible();

  await page.getByRole("button", { name: "Create" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Slug").fill(slug);
  await dialog.getByLabel("Name").fill(name);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/tenants") &&
      response.request().method() === "POST" &&
      response.ok()
  );

  await dialog.getByRole("button", { name: "Create" }).click();
  const response = await createResponsePromise;
  const tenant = (await response.json()) as { id: string };

  await expect(dialog).toBeHidden();
  await expect(page.getByText(slug)).toBeVisible();

  return {
    id: tenant.id,
    slug,
    name
  };
}

test("grouped admin navigation and platform CRUD stay operational", async ({ page }) => {
  await signIn(page);

  await expect(sidebarGroup(page, "Overview")).toBeVisible();
  await expect(sidebarGroup(page, "Platform")).toBeVisible();
  await expect(sidebarGroup(page, "Catalog")).toBeVisible();
  await expect(sidebarGroup(page, "Operations")).toBeVisible();
  await expect(sidebarGroup(page, "Control")).toBeVisible();

  const tenant = await createTenant(page);
  await expect(page.getByText(tenant.name)).toBeVisible();
});

test("catalog CRUD can create a brand for a tenant", async ({ page }) => {
  await signIn(page);
  const tenant = await createTenant(page);

  const unique = randomUUID().slice(0, 8);
  const code = `brand-${unique}`;
  const name = `Brand ${unique}`;

  await page.goto("/brands");
  await expect(pageHeading(page, "Brands")).toBeVisible();
  await page.getByRole("button", { name: "Create" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tenant ID").fill(tenant.id);
  await dialog.getByLabel("Code").fill(code);
  await dialog.getByLabel("Name").fill(name);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/brands") &&
      response.request().method() === "POST" &&
      response.ok()
  );

  await dialog.getByRole("button", { name: "Create" }).click();
  await createResponsePromise;

  await expect(dialog).toBeHidden();
  await expect(page.getByText(code)).toBeVisible();
});

test("payment provider secrets never read back in the UI", async ({ page }) => {
  await signIn(page);
  const tenant = await createTenant(page);
  const unique = randomUUID().slice(0, 8);
  const providerKey = `pw-provider-${unique}`;
  const secretMarker = `pw-secret-${unique}`;

  await page.goto("/payment-provider-configs");
  await expect(pageHeading(page, "Payment provider configs")).toBeVisible();

  const tenantScopeField = page.locator("label.field").filter({ hasText: "Tenant ID" });
  await tenantScopeField.locator("input").fill(tenant.id);
  await page.getByRole("button", { name: "Create config" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.locator("label.field").filter({ hasText: "Provider key" }).locator("input").fill(providerKey);
  await dialog
    .locator("label.field")
    .filter({ hasText: "Secrets JSON (write-only)" })
    .locator("textarea")
    .fill(`{"apiKey":"${secretMarker}"}`);

  await dialog.getByRole("button", { name: "Create" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(providerKey)).toBeVisible();
  await expect(page.getByText(secretMarker)).toHaveCount(0);
  await expect(page.getByText("encrypted", { exact: false })).toBeVisible();
});

test("owner cabinet supports read mode switching", async ({ page }) => {
  await signIn(page);
  const tenant = await createTenant(page);

  await page.goto("/owner-cabinet");
  await expect(pageHeading(page, "Owner cabinet")).toBeVisible();

  const tenantScopeField = page.locator("label.field").filter({ hasText: "Tenant ID" });
  await tenantScopeField.locator("input").fill(tenant.id);

  const ownerCabinetResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/analytics/owner-cabinet") &&
      response.request().method() === "GET" &&
      response.ok()
  );

  const readModeField = page.locator("label.field").filter({ hasText: "Read mode" });
  await readModeField.locator(".ant-select-selector").click();
  await page.getByTitle("Snapshot only").click();
  await page.getByRole("button", { name: "Refresh" }).click();

  await ownerCabinetResponse;
  await expect(readModeField).toContainText("Snapshot only");
});
