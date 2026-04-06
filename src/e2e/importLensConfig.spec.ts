import path from "path";
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog, getColId } from "./utils";

test("import lens-config.json and verify System Specs and Prescription", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  // 1. Navigate to Prescription tab and upload the JSON file
  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('button[aria-label="Load Config"]').click(),
  ]);
  await fileChooser.setFiles(path.join(__dirname, "jsons", "lens-config.json"));

  // 2. Confirm import dialog
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  await dialog.getByRole("button", { name: "Load" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5_000 });

  // 3. Verify System Specs tab
  await page.getByRole("tab", { name: "System Specs" }).click();

  // Aperture
  await expect(
    page.locator('[aria-label="System aperture type"]')
  ).toHaveValue("object:epd");
  await expect(page.locator('[aria-label="Aperture value"]')).toHaveValue(
    "1220"
  );

  // Field summary
  const fieldSummary = page.getByLabel("Configure field");
  await expect(fieldSummary).toContainText("3 fields");
  await expect(fieldSummary).toContainText("0.05°");

  // Wavelength summary
  await expect(page.getByLabel("Configure wavelengths")).toContainText(
    "5 wavelengths"
  );

  // 4. Verify Field modal
  await page.getByLabel("Configure field").click();
  const fieldModal = page.getByRole("dialog", {
    name: "Field",
  });
  await fieldModal.waitFor({ state: "visible", timeout: 3_000 });
  await expect(page.getByLabel("Field type")).toHaveValue("angle");
  await expect(page.getByLabel("Max field value")).toHaveValue("0.05");

  const fieldGrid = '[role="dialog"][aria-labelledby="field-modal-title"]';
  await expect(
    page.locator(`${fieldGrid} .ag-row[row-index="0"] .ag-cell[col-id="value"]`)
  ).toContainText("0");
  await expect(
    page.locator(`${fieldGrid} .ag-row[row-index="1"] .ag-cell[col-id="value"]`)
  ).toContainText("0.707");
  await expect(
    page.locator(`${fieldGrid} .ag-row[row-index="2"] .ag-cell[col-id="value"]`)
  ).toContainText("1");

  await fieldModal.getByRole("button", { name: "Cancel" }).click();
  await fieldModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 5. Verify Wavelength modal
  await page.getByLabel("Configure wavelengths").click();
  const wlModal = page.getByRole("dialog", { name: "Wavelengths" });
  await wlModal.waitFor({ state: "visible", timeout: 3_000 });

  const wlGrid = '[role="dialog"][aria-labelledby="wavelength-modal-title"]';
  // 5 rows exist
  await expect(
    page.locator(`${wlGrid} .ag-row[row-index="4"]`)
  ).toBeAttached({ timeout: 3_000 });

  // Row 2 (e line = reference, 546.073 nm)
  await expect(
    page.locator(
      `${wlGrid} .ag-row[row-index="2"] .ag-cell[col-id="wavelength"]`
    )
  ).toContainText("546.073");

  // Reference radio: referenceIndex=2 (0-based) → aria-label="Reference wavelength 3" (1-based)
  await expect(
    page.locator('input[type="radio"][aria-label="Reference wavelength 3"]')
  ).toBeChecked();

  await wlModal.getByRole("button", { name: "Cancel" }).click();
  await wlModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 6. Verify Prescription grid
  await page.getByRole("tab", { name: "Prescription" }).click();
  const prescGrid = '[aria-label="Lens prescription editor"]';

  const colIdSurface = await getColId(page, prescGrid, "Surface");
  const colIdRadius = await getColId(page, prescGrid, "Radius of Curvature");
  const colIdThickness = await getColId(page, prescGrid, "Thickness");
  const colIdMedium = await getColId(page, prescGrid, "Medium");
  const colIdSemiDiam = await getColId(page, prescGrid, "Semi-diam.");

  // Row 1: Stop — aspherical + decenter
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="1"] .ag-cell[col-id="${colIdSurface}"]`
    )
  ).toContainText("Stop");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="1"] .ag-cell[col-id="${colIdRadius}"]`
    )
  ).toContainText("-24384");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="1"] .ag-cell[col-id="${colIdThickness}"]`
    )
  ).toContainText("-11600");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="1"] .ag-cell[col-id="${colIdMedium}"]`
    )
  ).toContainText("REFL");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="1"] .ag-cell[col-id="${colIdSemiDiam}"]`
    )
  ).toContainText("609.6");

  const row1 = page.locator(`${prescGrid} .ag-row[row-index="1"]`);
  await row1.hover();
  await expect(
    row1.locator('[aria-label="Edit aspherical parameters"]')
  ).toHaveText("Set");
  await expect(
    row1.locator('[aria-label="Edit decenter and tilt"]')
  ).toHaveText("Set");

  // Row 3: Default, N-BK7, decenter only
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="3"] .ag-cell[col-id="${colIdRadius}"]`
    )
  ).toContainText("0");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="3"] .ag-cell[col-id="${colIdThickness}"]`
    )
  ).toContainText("-9");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="3"] .ag-cell[col-id="${colIdMedium}"]`
    )
  ).toContainText("N-BK7");

  const row3 = page.locator(`${prescGrid} .ag-row[row-index="3"]`);
  await row3.hover();
  await expect(
    row3.locator('[aria-label="Edit decenter and tilt"]')
  ).toHaveText("Set");
  await expect(
    row3.locator('[aria-label="Edit aspherical parameters"]')
  ).toHaveText("—");

  // Row 4: Default, R=-556.536, air, reverse decenter
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="4"] .ag-cell[col-id="${colIdRadius}"]`
    )
  ).toContainText("-556.536");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="4"] .ag-cell[col-id="${colIdMedium}"]`
    )
  ).toContainText("air");

  const row4 = page.locator(`${prescGrid} .ag-row[row-index="4"]`);
  await row4.hover();
  await expect(
    row4.locator('[aria-label="Edit decenter and tilt"]')
  ).toHaveText("Set");

  // Row 7: Default, R=-514.2, N-BK7, decenter
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="7"] .ag-cell[col-id="${colIdRadius}"]`
    )
  ).toContainText("-514.2");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="7"] .ag-cell[col-id="${colIdThickness}"]`
    )
  ).toContainText("-11");
  await expect(
    page.locator(
      `${prescGrid} .ag-row[row-index="7"] .ag-cell[col-id="${colIdMedium}"]`
    )
  ).toContainText("N-BK7");

  const row7 = page.locator(`${prescGrid} .ag-row[row-index="7"]`);
  await row7.hover();
  await expect(
    row7.locator('[aria-label="Edit decenter and tilt"]')
  ).toHaveText("Set");

  // Row 10: Image — decenter set
  const row10 = page.locator(`${prescGrid} .ag-row[row-index="10"]`);
  await row10.hover();
  await expect(
    row10.locator('[aria-label="Edit decenter and tilt"]')
  ).toHaveText("Set");

  // 7. Verify Aspherical modal for row 1 (Stop)
  await row1.hover();
  await row1.locator('[aria-label="Edit aspherical parameters"]').click();
  const asphModal = page.locator('[role="dialog"][aria-labelledby="aspherical-modal-title"]');
  await asphModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(asphModal.getByLabel("Conic constant")).toHaveValue("-1");
  await expect(asphModal.getByLabel("Type")).toHaveValue("Conic");
  await asphModal.getByRole("button", { name: "Cancel" }).click();
  await asphModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 8. Verify Decenter modal for row 1 (Stop — bend)
  await row1.hover();
  await row1.locator('[aria-label="Edit decenter and tilt"]').click();
  const decModal = page.locator('[role="dialog"][aria-labelledby="decenter-modal-title"]');
  await decModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(
    page.getByLabel("Coordinate system for this and following surfaces")
  ).toHaveValue("bend");
  await expect(page.getByLabel("Alpha (°)")).toHaveValue("1.7");
  await decModal.getByRole("button", { name: "Cancel" }).click();
  await decModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 9. Verify Decenter modal for row 3 (S2 — decenter with offsetY)
  await row3.hover();
  await row3.locator('[aria-label="Edit decenter and tilt"]').click();
  await decModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(
    page.getByLabel("Coordinate system for this and following surfaces")
  ).toHaveValue("decenter");
  await expect(page.getByLabel("Alpha (°)")).toHaveValue(/-16\.95/);
  await expect(page.getByLabel("Offset Y")).toHaveValue(/-2\.66/);
  await decModal.getByRole("button", { name: "Cancel" }).click();
  await decModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 10. Verify Decenter modal for row 10 (Image)
  await row10.hover();
  await row10.locator('[aria-label="Edit decenter and tilt"]').click();
  await decModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(
    page.getByLabel("Coordinate system for this and following surfaces")
  ).toHaveValue("decenter");
  await expect(page.getByLabel("Alpha (°)")).toHaveValue(/2\.99/);
  await expect(page.getByLabel("Offset Y")).toHaveValue("0.02777");
  await decModal.getByRole("button", { name: "Cancel" }).click();
  await decModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 11. Update System and verify output
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await updateBtn.click();
  await expect(updateBtn).toBeDisabled({ timeout: 5_000 });
  await expect(updateBtn).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator("text=/EFL:/").first()).toBeVisible({
    timeout: 10_000,
  });
});
