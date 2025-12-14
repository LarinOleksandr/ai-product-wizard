import { test, expect } from "@playwright/test";

test("app loads and navigates (routing smoke)", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await expect(page).toHaveURL(/\/$/);

  await page.getByTestId("nav-projects").click();
  await expect(page).toHaveURL(/\/projects$/);

  await page.getByTestId("nav-wizard").click();
  await expect(page).toHaveURL(/\/wizard$/);
});
