import { test, expect } from "./fixtures";
import { reloadAndWait } from "./utils";

const PRESCRIPTION_GRID = '[aria-label="Lens prescription editor"]';

async function openObjectMediumSelector(page: Parameters<typeof reloadAndWait>[0]) {
  const objectRow = page.locator(`${PRESCRIPTION_GRID} .ag-row`, {
    has: page.getByRole("gridcell", { name: "Object", exact: true }),
  });
  await expect(objectRow).toHaveCount(1);
  await objectRow.hover();
  await objectRow.getByRole("button", { name: "Edit medium" }).click();

  const modal = page.getByRole("dialog", { name: "Select Medium" });
  await expect(modal).toBeVisible();
  return { modal, objectRow };
}

async function selectSchottNbk7AndOpenGlassMap(
  page: Parameters<typeof reloadAndWait>[0]
) {
  const { modal, objectRow } = await openObjectMediumSelector(page);
  await modal.getByLabel("Catalog").selectOption("Schott");
  await modal.getByLabel("Glass", { exact: true }).fill("N-BK7");
  await modal.getByRole("link", { name: "View in glass map" }).click();

  await expect(page).toHaveURL(
    /\/glass-map\?source=medium-selector&catalog=Schott&glass=N-BK7$/
  );
  await expect(page.getByRole("heading", { name: "N-BK7" })).toBeVisible();
  return objectRow;
}

test.beforeEach(async ({ pyodidePage: page }) => {
  await reloadAndWait(page);
});

test("returns to the uncommitted medium draft without changing the glass-map selection", async ({
  pyodidePage: page,
}) => {
  const objectRow = await selectSchottNbk7AndOpenGlassMap(page);

  await page.getByRole("radio", { name: "Partial Dispersion" }).click();
  await page.getByRole("radio", { name: "e", exact: true }).click();
  await page.getByRole("radio", { name: "P_F,e", exact: true }).click();
  await page.getByRole("checkbox", { name: "Hoya" }).click();
  await expect(page.getByRole("heading", { name: "N-BK7" })).toBeVisible();

  await page.getByRole("link", { name: "Use selected glass" }).click();

  await expect(page).toHaveURL(/\/$/);
  const modal = page.getByRole("dialog", { name: "Select Medium" });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel("Catalog")).toHaveValue("Schott");
  await expect(modal.getByLabel("Glass", { exact: true })).toHaveValue("N-BK7");
  await expect(objectRow).not.toContainText("N-BK7");
});

test("returns with a newly selected glass and commits it only after confirmation", async ({
  pyodidePage: page,
}) => {
  const objectRow = await selectSchottNbk7AndOpenGlassMap(page);
  const unselectedPoint = page.locator('[data-testid="glass-point"][stroke="none"]').first();
  await unselectedPoint.dispatchEvent("click");

  const selectedHeading = page.getByRole("heading", { level: 3 });
  const detailPanel = selectedHeading.locator("..");
  const selectedGlass = await selectedHeading.textContent();
  const selectedCatalog = await detailPanel.locator("span").first().textContent();
  expect(selectedGlass?.trim()).toBeTruthy();
  expect(selectedCatalog?.trim()).toBeTruthy();
  expect(selectedGlass?.trim()).not.toBe("N-BK7");

  await page.getByRole("link", { name: "Use selected glass" }).click();

  await expect(page).toHaveURL(/\/$/);
  const modal = page.getByRole("dialog", { name: "Select Medium" });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel("Catalog")).toHaveValue(selectedCatalog!.trim());
  await expect(modal.getByLabel("Glass", { exact: true })).toHaveValue(selectedGlass!.trim());
  await expect(objectRow).not.toContainText(selectedGlass!.trim());

  await modal.getByRole("button", { name: "Confirm" }).click();
  await expect(modal).toBeHidden();
  await expect(objectRow).toContainText(selectedGlass!.trim());
});
