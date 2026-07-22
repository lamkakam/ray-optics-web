/**
 * Playwright end-to-end coverage for the complete singlet optimization workflow, from importing the supplied lens configuration through applying optimized even-aspheric coefficients back to the Lens Editor.
 *
 * @remarks
 * ## Flow
 *
 * 1. Load `jsons/singlet-lens-optimization-test.json` through the Lens Editor and confirm the import.
 * 2. Open Optimization and select the least-squares Levenberg–Marquardt method.
 * 3. Configure displayed surface index `2` as Even Aspheric, with `a_4`, `a_6`, `a_8`, and `a_10` variable.
 * 4. Add a Ray Fan operand with weight `100`.
 * 5. Run optimization, wait for completion, and dismiss the progress dialog.
 * 6. Attempt to leave Optimization through the app navigation, stay on the first unapplied-result prompt, then leave again and apply the optimized model through the confirmation dialog.
 * 7. Return to the Lens Editor and inspect displayed surface index `2`.
 *
 * ## Assertions
 *
 * - Optimization completes and exposes the progress dialog's `OK` action.
 * - The applied surface reports `Even Aspherical` in the prescription grid.
 * - The `a_4`, `a_6`, `a_8`, and `a_10` fields contain finite numeric values.
 * - At least one of those optimized coefficients is non-zero.
 *
 * The test identifies the target prescription row by its displayed `Index` value rather than its positional AG Grid row index. Because changing an operand kind can recreate the operand-grid columns, the weight edit targets the stable Weight cell position in the single operand row rather than retaining a transient AG Grid column ID.
 */
import path from "path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  dismissAnyOpenDialog,
  getColId,
  getPrescriptionSurfaceRow,
  selectGridOption,
} from "./utils";

async function navigateToLensEditorFromMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('nav a[aria-label="Lens Editor"]').evaluate((link) => {
    link.click();
  });
}

test("optimize a singlet with even-aspheric coefficients and apply it to the editor", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Load Config", exact: true }).click(),
  ]);
  await fileChooser.setFiles(
    path.join(__dirname, "jsons", "singlet-lens-optimization-test.json")
  );
  const loadDialog = page.getByRole("dialog");
  await loadDialog.getByRole("button", { name: "Load" }).click();
  await expect(loadDialog).toBeHidden();

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('a[href="/optimization"]').click();
  await page.getByRole("tab", { name: "Algorithm" }).click();
  await page.getByLabel("Optimizer Kind").selectOption("least_squares");
  await page.getByLabel("Method").selectOption("lm");

  await page.getByRole("tab", { name: "Lens Prescription" }).click();
  await page.getByRole("button", { name: "Asphere mode for surface 2" }).click();
  const asphereDialog = page.getByRole("dialog", {
    name: "Asphere Variable / Pickup",
  });
  await asphereDialog.getByLabel("Asphere type").selectOption("EvenAspherical");
  for (const coefficient of ["a_4", "a_6", "a_8", "a_10"]) {
    await asphereDialog.getByLabel(`${coefficient} mode`).selectOption("variable");
  }
  await asphereDialog.getByRole("button", { name: "Confirm" }).click();
  await expect(asphereDialog).toBeHidden();

  await page.getByRole("tab", { name: "Operands" }).click();
  await page.getByRole("button", { name: "Add operand" }).click();
  const operandsGrid = '[data-testid="optimization-operands-tab"]';
  const operandKindCol = await getColId(page, operandsGrid, "Operand Kind");
  await selectGridOption(page, operandsGrid, 0, operandKindCol, "Ray Fan");
  const operandRow = page.locator(`${operandsGrid} .ag-row[row-index="0"]`);
  const weightCell = operandRow.getByRole("gridcell").nth(2);
  await weightCell.dblclick();
  await weightCell.locator("input").fill("100");
  await weightCell.locator("input").press("Enter");

  await page.getByRole("button", { name: "Optimize" }).click();
  const progressDialog = page.getByRole("dialog", { name: "Optimization Progress" });
  await progressDialog.getByRole("button", { name: "OK" }).waitFor({
    state: "visible",
    timeout: 120_000,
  });
  await progressDialog.getByRole("button", { name: "OK" }).click();
  await expect(progressDialog).toBeHidden();

  await navigateToLensEditorFromMenu(page);
  const unappliedResultDialog = page.getByRole("dialog", {
    name: "Unapplied Optimization Result",
  });
  await expect(unappliedResultDialog).toBeVisible();
  await expect(page).toHaveURL(/\/optimization$/);
  await expect(
    page
      .getByTestId("optimization-shared-content-wrapper")
      .getByRole("button", { name: "Apply to Editor" }),
  ).toBeVisible();
  await unappliedResultDialog.getByRole("button", { name: "Stay" }).click();
  await expect(unappliedResultDialog).toBeHidden();

  await navigateToLensEditorFromMenu(page);
  await expect(unappliedResultDialog).toBeVisible();
  await expect(page).toHaveURL(/\/optimization$/);
  await unappliedResultDialog
    .getByRole("button", { name: "Apply to Editor" })
    .click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("tab", { name: "Prescription" }).click();
  const prescriptionGrid = '[aria-label="Lens prescription editor"]';
  const surface2 = await getPrescriptionSurfaceRow(page, prescriptionGrid, 2);
  await surface2.hover();
  const asphereButton = surface2.getByRole("button", {
    name: "Edit aspherical parameters",
  });
  await expect(asphereButton).toHaveText("Even Aspherical");
  await asphereButton.click();

  const editorAsphereDialog = page.getByRole("dialog", { name: "Aspherical" });
  const coefficientValues = await Promise.all(
    ["a4", "a6", "a8", "a10"].map(async (label) => {
      const value = await editorAsphereDialog.getByLabel(label).inputValue();
      expect(Number.isFinite(Number(value))).toBe(true);
      return Number(value);
    })
  );
  expect(coefficientValues.some((value) => value !== 0)).toBe(true);
});
