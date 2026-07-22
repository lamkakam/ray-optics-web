/**
 * Playwright end-to-end test that manually builds the Sasian Triplet lens from a blank Lens Editor state and verifies the updated optical system renders analysis output.
 *
 * @remarks
 * ## Flow
 *
 * - Reload the app and wait for Pyodide initialization.
 * - Configure System Specs aperture to `12.5`.
 * - Open the Half-Field modal, switch to angle fields, set the max half-field value to `20`, and add normalized field rows `0.707` and `1`.
 * - Open the Wavelengths modal, configure Fraunhofer lines `F`, `d`, and `C`, set the `d` line weight to `2`, and mark it as the reference wavelength.
 * - Open the Prescription tab and insert six surface rows at the end of the prescription grid.
 * - Edit surfaces `1` through `6` by their visible prescription `Index` column values, not AG Grid physical `row-index` attributes.
 * - Set glass media for surfaces `1`, `3`, and `5` through the Medium selector modal.
 * - Click `Update System`, wait for computation to complete, then verify the EFL chip and lens layout image are visible.
 *
 * ## Selector Conventions
 *
 * - Half-Field and wavelength modal grids are small modal-local AG Grid instances; their helpers use AG Grid `row-index`.
 * - The lens prescription grid uses helpers from `utils.ts` that locate rows by the rendered `Index` column. The `Index` column is the stable user-facing surface identity and skips Object/Image rows.
 * - Prescription helpers first locate the pinned `Index` row, then read or edit cells from the matching center-row container for the same AG Grid `row-index`.
 * - Prescription row insertion waits for the expected count of visible surface indices instead of assuming a specific AG Grid physical row position.
 */
import { test, expect } from "./fixtures";
import {
  reloadAndWait,
  editPrescriptionNumberCell,
  selectPrescriptionGridOption,
  insertPrescriptionSurfaceAtEnd,
  setPrescriptionMedium,
  editFieldRow,
  selectFraunhofer,
  editWeightCell,
} from "./utils";

test("manually input Sasian Triplet and update system", async ({
  pyodidePage: page,
}) => {
  // Reload to get a guaranteed blank demo model state
  await reloadAndWait(page);

  // 1. System Specs tab → Aperture value
  await page.getByRole("tab", { name: "System Specs" }).click();
  const apertureInput = page.getByLabel("Aperture value");
  await apertureInput.clear();
  await apertureInput.fill("12.5");
  await apertureInput.blur();

  // 2. Field modal
  await page.getByLabel("Configure field").click();
  const fieldModal = page.getByRole("dialog", { name: "Half-Field" });
  await fieldModal.waitFor({ state: "visible", timeout: 3_000 });
  await page.getByLabel("Field type").selectOption("angle");
  await page.getByLabel("Max half-field value").clear();
  await page.getByLabel("Max half-field value").fill("20");
  await page.getByLabel("Max half-field value").blur();
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

  // 3. Wavelength modal
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

  // 4. Prescription tab — add 6 surfaces
  await page.getByRole("tab", { name: "Prescription" }).click();
  const prescGrid = '[aria-label="Lens prescription editor"]';
  // Insert all 6 rows first, then edit by visible surface index.
  for (let surfaceCount = 1; surfaceCount <= 6; surfaceCount++) {
    await insertPrescriptionSurfaceAtEnd(page, prescGrid, surfaceCount);
  }
  // S1: Default, R=23.713, t=4.831, N-LAK9/Schott
  await editPrescriptionNumberCell(page, prescGrid, 1, "Radius of Curvature", "23.713");
  await editPrescriptionNumberCell(page, prescGrid, 1, "Thickness", "4.831");
  await setPrescriptionMedium(page, prescGrid, 1, "Schott", "N-LAK9");
  // S2: Default, R=7331.288, t=5.86, air (no medium change)
  await editPrescriptionNumberCell(page, prescGrid, 2, "Radius of Curvature", "7331.288");
  await editPrescriptionNumberCell(page, prescGrid, 2, "Thickness", "5.86");
  // S3: Stop, R=-24.456, t=0.975, N-SF5/Schott
  await selectPrescriptionGridOption(page, prescGrid, 3, "Surface", "Stop");
  await editPrescriptionNumberCell(page, prescGrid, 3, "Radius of Curvature", "-24.456");
  await editPrescriptionNumberCell(page, prescGrid, 3, "Thickness", "0.975");
  await setPrescriptionMedium(page, prescGrid, 3, "Schott", "N-SF5");
  // S4: Default, R=21.896, t=4.822, air
  await editPrescriptionNumberCell(page, prescGrid, 4, "Radius of Curvature", "21.896");
  await editPrescriptionNumberCell(page, prescGrid, 4, "Thickness", "4.822");
  // S5: Default, R=86.759, t=3.127, N-LAK9/Schott
  await editPrescriptionNumberCell(page, prescGrid, 5, "Radius of Curvature", "86.759");
  await editPrescriptionNumberCell(page, prescGrid, 5, "Thickness", "3.127");
  await setPrescriptionMedium(page, prescGrid, 5, "Schott", "N-LAK9");
  // S6: Default, R=-20.4942, t=41.2365, air
  await editPrescriptionNumberCell(page, prescGrid, 6, "Radius of Curvature", "-20.4942");
  await editPrescriptionNumberCell(page, prescGrid, 6, "Thickness", "41.2365");

  // 5. Click Update System
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await updateBtn.click();

  // 6. Wait for compute to finish (button disabled then re-enabled)
  await expect(updateBtn).toBeDisabled({ timeout: 5_000 });
  await expect(updateBtn).toBeEnabled({ timeout: 60_000 });

  // 7. Verify: EFL chip visible
  await expect(page.locator("text=/EFL:/").first()).toBeVisible({
    timeout: 10_000,
  });

  // 8. Verify: lens layout image visible
  await expect(
    page.locator('img[alt="Lens layout diagram"]')
  ).toBeVisible({ timeout: 10_000 });
});
