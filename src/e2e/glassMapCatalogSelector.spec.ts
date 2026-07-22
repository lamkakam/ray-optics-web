/** End-to-end coverage for the Glass Map catalog selector. The scenario opens the side navigation and enters Glass Map, chooses Schott, types the known `N-BK7` glass with non-canonical casing, verifies canonicalization, commits the selection, and verifies the detail heading. It returns the worker-scoped page to Lens Editor so later specifications retain their expected starting route. */
import { test, expect } from "./fixtures";
import { reloadAndWait } from "./utils";

test.beforeEach(async ({ pyodidePage: page }) => {
  await reloadAndWait(page);
});

test("selects a known catalog glass from the Glass Map controls", async ({ pyodidePage: page }) => {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Glass Map" }).click();
  await expect(page).toHaveURL(/\/glass-map$/);

  await page.getByRole("combobox", { name: "Catalog" }).selectOption("Schott");
  await page.getByRole("combobox", { name: "Glass" }).fill("n-bk7");
  await expect(page.getByRole("combobox", { name: "Glass" })).toHaveValue("N-BK7");
  await page.getByRole("button", { name: "Select glass" }).click();

  await expect(page.getByRole("heading", { name: "N-BK7" })).toBeVisible();

  // The worker-scoped page is shared by later specs, which initialize from the editor route.
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Lens Editor" }).click();
  await expect(page).toHaveURL(/\/$/);
});
