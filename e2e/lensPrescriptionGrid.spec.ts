import { test, expect } from "@playwright/test";

test.describe("Lens Prescription Grid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads with title", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("Ray Optics Web");
  });

  test("grid wrapper renders", async ({ page }) => {
    const grid = page.locator("[aria-label='Lens prescription editor']");
    await expect(grid).toBeAttached({ timeout: 10000 });
  });

  test("toolbar buttons are present", async ({ page }) => {
    await expect(page.getByText("Add Row")).toBeVisible();
    await expect(page.getByText("Delete Row")).toBeVisible();
    await expect(page.getByText("Export JSON")).toBeVisible();
  });

  test("Add Row and Delete Row are disabled initially", async ({ page }) => {
    await expect(page.getByText("Add Row")).toBeDisabled();
    await expect(page.getByText("Delete Row")).toBeDisabled();
  });
});
