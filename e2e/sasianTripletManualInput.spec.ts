import { test, expect } from "@playwright/test";
import {
  PYODIDE_TIMEOUT,
  waitForPyodide,
  getColId,
  editNumberCell,
  selectGridOption,
  insertRowAfter,
  setMedium,
  editFieldRow,
  selectFraunhofer,
  editWeightCell,
} from "./utils";

test("manually input Sasian Triplet and update system", async ({ page }) => {
  test.setTimeout(PYODIDE_TIMEOUT + 60_000); // 180s total
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  // 1. Wait for Pyodide
  await waitForPyodide(page);

  // 2. System Specs tab → Aperture value
  await page.getByRole("tab", { name: "System Specs" }).click();
  const apertureInput = page.getByLabel("Aperture value");
  await apertureInput.clear();
  await apertureInput.fill("12.5");
  await apertureInput.blur();

  // 3. Field modal
  await page.getByLabel("Configure field").click();
  const fieldModal = page.getByRole("dialog", { name: "Field" });
  await fieldModal.waitFor({ state: "visible", timeout: 3_000 });
  await page.getByLabel("Field type").selectOption("angle");
  await page.getByLabel("Max field value").clear();
  await page.getByLabel("Max field value").fill("20");
  await page.getByLabel("Max field value").blur();
  // Row 0 already value=0 — skip. Add row 1 (0.707) and row 2 (1.0)
  await fieldModal
    .locator('.ag-row[row-index="0"]')
    .getByRole("button", { name: "Add field row" })
    .click();
  await fieldModal
    .locator('.ag-row[row-index="1"]')
    .waitFor({ state: "attached", timeout: 3_000 });
  await editFieldRow(
    page,
    '[role="dialog"][aria-labelledby="field-modal-title"]',
    1,
    "0.707"
  );
  await fieldModal
    .locator('.ag-row[row-index="1"]')
    .getByRole("button", { name: "Add field row" })
    .click();
  await fieldModal
    .locator('.ag-row[row-index="2"]')
    .waitFor({ state: "attached", timeout: 3_000 });
  await editFieldRow(
    page,
    '[role="dialog"][aria-labelledby="field-modal-title"]',
    2,
    "1"
  );
  await fieldModal.getByRole("button", { name: "Apply" }).click();
  await fieldModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 4. Wavelength modal
  await page.getByLabel("Configure wavelengths").click();
  const wlModal = page.getByRole("dialog", { name: "Wavelengths" });
  await wlModal.waitFor({ state: "visible", timeout: 3_000 });
  const wlGrid = '[role="dialog"][aria-labelledby="wavelength-modal-title"]';
  // Row 0: change e → F; weight stays 1
  await selectFraunhofer(page, wlGrid, 0, "F");
  // Add row 1: d, weight=2, set as reference
  await wlModal
    .locator('.ag-row[row-index="0"]')
    .getByRole("button", { name: "Add wavelength row" })
    .click();
  await wlModal
    .locator('.ag-row[row-index="1"]')
    .waitFor({ state: "attached", timeout: 3_000 });
  await selectFraunhofer(page, wlGrid, 1, "d");
  await editWeightCell(page, wlGrid, 1, "2");
  await page
    .locator('input[type="radio"][aria-label="Reference wavelength 2"]')
    .click();
  // Add row 2: C, weight=1
  await wlModal
    .locator('.ag-row[row-index="1"]')
    .getByRole("button", { name: "Add wavelength row" })
    .click();
  await wlModal
    .locator('.ag-row[row-index="2"]')
    .waitFor({ state: "attached", timeout: 3_000 });
  await selectFraunhofer(page, wlGrid, 2, "C");
  await wlModal.getByRole("button", { name: "Apply" }).click();
  await wlModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 5. Prescription tab — add 6 surfaces
  await page.getByRole("tab", { name: "Prescription" }).click();
  const prescGrid = '[aria-label="Lens prescription editor"]';
  // Discover col-ids from headers
  const colIdSurface = await getColId(page, prescGrid, "Surface");
  const colIdRadius = await getColId(page, prescGrid, "Radius of Curvature");
  const colIdThickness = await getColId(page, prescGrid, "Thickness");
  // Insert all 6 rows first, then edit (avoids row-index shifting issues)
  for (let i = 0; i < 6; i++) {
    await insertRowAfter(page, prescGrid, i); // inserts after row i; new row appears at i+1
  }
  // S1: Default, R=23.713, t=4.831, N-LAK9/Schott
  await editNumberCell(page, prescGrid, 1, colIdRadius, "23.713");
  await editNumberCell(page, prescGrid, 1, colIdThickness, "4.831");
  await setMedium(page, prescGrid, 1, "Schott", "N-LAK9");
  // S2: Default, R=7331.288, t=5.86, air (no medium change)
  await editNumberCell(page, prescGrid, 2, colIdRadius, "7331.288");
  await editNumberCell(page, prescGrid, 2, colIdThickness, "5.86");
  // S3: Stop, R=-24.456, t=0.975, N-SF5/Schott
  await selectGridOption(page, prescGrid, 3, colIdSurface, "Stop");
  await editNumberCell(page, prescGrid, 3, colIdRadius, "-24.456");
  await editNumberCell(page, prescGrid, 3, colIdThickness, "0.975");
  await setMedium(page, prescGrid, 3, "Schott", "N-SF5");
  // S4: Default, R=21.896, t=4.822, air
  await editNumberCell(page, prescGrid, 4, colIdRadius, "21.896");
  await editNumberCell(page, prescGrid, 4, colIdThickness, "4.822");
  // S5: Default, R=86.759, t=3.127, N-LAK9/Schott
  await editNumberCell(page, prescGrid, 5, colIdRadius, "86.759");
  await editNumberCell(page, prescGrid, 5, colIdThickness, "3.127");
  await setMedium(page, prescGrid, 5, "Schott", "N-LAK9");
  // S6: Default, R=-20.4942, t=41.2365, air
  await editNumberCell(page, prescGrid, 6, colIdRadius, "-20.4942");
  await editNumberCell(page, prescGrid, 6, colIdThickness, "41.2365");

  // 6. Click Update System
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await updateBtn.click();

  // 7. Wait for compute to finish (button disabled then re-enabled)
  await expect(updateBtn).toBeDisabled({ timeout: 5_000 });
  await expect(updateBtn).toBeEnabled({ timeout: 60_000 });

  // 8. Verify: EFL chip visible
  await expect(page.locator("text=/EFL:/").first()).toBeVisible({
    timeout: 10_000,
  });

  // 9. Verify: lens layout image visible
  await expect(
    page.locator('img[alt="Lens layout diagram"]')
  ).toBeVisible({ timeout: 10_000 });
});
