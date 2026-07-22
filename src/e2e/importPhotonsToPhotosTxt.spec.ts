/**
 * End-to-end coverage for importing Photons to Photos `.txt` files through the Lens Editor toolbar.
 *
 * @remarks
 * ## Coverage
 *
 * - Prime import: opens the TXT file chooser from `Import a file from Photons to Photos`, confirms overwrite, and verifies representative system specs plus prescription-grid values.
 * - Zoom import: selects a focal length in the modal, confirms overwrite, and verifies selected-column field and thickness values.
 *
 * ## Notes
 *
 * - Fixtures are reused from `src/__tests__/data/photons-to-photos`.
 * - The test intentionally verifies imported UI state rather than running an optical compute.
 */
import path from "path";
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog, getColId } from "./utils";

const photonsToPhotosDir = path.join(__dirname, "..", "__tests__", "data", "photons-to-photos");

test("import prime Photons to Photos txt and verify specs and prescription", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('button[aria-label="Import a file from Photons to Photos"]').click(),
  ]);
  await fileChooser.setFiles(path.join(photonsToPhotosDir, "prime-no-glass-type.txt"));

  const confirmDialog = page.getByRole("dialog", { name: "Load Config" });
  await confirmDialog.waitFor({ state: "visible", timeout: 5_000 });
  await confirmDialog.getByRole("button", { name: "Load" }).click();
  await confirmDialog.waitFor({ state: "hidden", timeout: 5_000 });

  await page.getByRole("tab", { name: "System Specs" }).click();
  await expect(page.locator('[aria-label="System aperture type"]')).toHaveValue("image:f/#");
  await expect(page.locator('[aria-label="Aperture value"]')).toHaveValue("4");
  await expect(page.getByLabel("Configure field")).toContainText("6°");

  await page.getByRole("tab", { name: "Prescription" }).click();
  const prescGrid = '[aria-label="Lens prescription editor"]';
  const colIdSurface = await getColId(page, prescGrid, "Surface");
  const colIdThickness = await getColId(page, prescGrid, "Thickness");
  const colIdMedium = await getColId(page, prescGrid, "Medium");

  await expect(
    page.locator(`${prescGrid} .ag-row[row-index="5"] .ag-cell[col-id="${colIdSurface}"]`)
  ).toContainText("Stop");
  await expect(
    page.locator(`${prescGrid} .ag-row[row-index="5"] .ag-cell[col-id="${colIdThickness}"]`)
  ).toContainText("4.16");
  await expect(
    page.locator(`${prescGrid} .ag-row[row-index="9"] .ag-cell[col-id="${colIdThickness}"]`)
  ).toContainText("103.24");
  await expect(
    page.locator(`${prescGrid} .ag-row[row-index="1"] .ag-cell[col-id="${colIdMedium}"]`)
  ).toContainText("1.5709");
});

test("import zoom Photons to Photos txt using selected focal length", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('button[aria-label="Import a file from Photons to Photos"]').click(),
  ]);
  await fileChooser.setFiles(path.join(photonsToPhotosDir, "zoom-wide-angle-aspherical-no-glass-type.txt"));

  const focalDialog = page.getByRole("dialog", { name: "Select Focal Length" });
  await focalDialog.waitFor({ state: "visible", timeout: 5_000 });
  await focalDialog.getByRole("radio", { name: "24.376 mm" }).check();
  await focalDialog.getByRole("button", { name: "Confirm" }).click();
  await focalDialog.waitFor({ state: "hidden", timeout: 5_000 });

  const confirmDialog = page.getByRole("dialog", { name: "Load Config" });
  await confirmDialog.waitFor({ state: "visible", timeout: 5_000 });
  await confirmDialog.getByRole("button", { name: "Load" }).click();
  await confirmDialog.waitFor({ state: "hidden", timeout: 5_000 });

  await page.getByRole("tab", { name: "System Specs" }).click();
  await expect(page.locator('[aria-label="Aperture value"]')).toHaveValue("2.912");
  await expect(page.getByLabel("Configure field")).toContainText("16.779°");

  await page.getByRole("tab", { name: "Prescription" }).click();
  const prescGrid = '[aria-label="Lens prescription editor"]';
  const colIdThickness = await getColId(page, prescGrid, "Thickness");
  await expect(
    page.locator(`${prescGrid} .ag-row[row-index="5"] .ag-cell[col-id="${colIdThickness}"]`)
  ).toContainText("18.225");
});
