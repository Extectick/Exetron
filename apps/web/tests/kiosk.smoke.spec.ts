import { expect, test } from "@playwright/test";

test("kiosk route stays outside admin shell and rejects missing token", async ({ page }) => {
  await page.goto("/kiosk/test-device");

  await expect(page.getByText("Kiosk access token is missing.")).toBeVisible();
  await expect(page.getByText("Admin Control Plane")).toHaveCount(0);
});
