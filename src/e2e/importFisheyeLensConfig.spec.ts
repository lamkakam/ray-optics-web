/**
End-to-end coverage for importing `fisheye-lens-config.json`, explicitly running `Update System`, and verifying that the imported prescription and system-spec state remains consistent after computation.

## Covered Flow

1. Open the `Prescription` tab and import `src/e2e/jsons/fisheye-lens-config.json`.
2. Confirm the load dialog.
3. Click `Update System` and wait for computation to finish.
4. Verify the auto aperture dimensions switch is checked and displays `Auto`.
5. Verify every imported surface row shows the expected label, radius, thickness, medium, and post-compute semi-diameter, and that inactive aspherical or tilt/decenter cells display `None`. Semi-diameters are parsed as finite numbers and compared with rounded regression references to three decimal places.
6. Verify `System Specs` keeps `Entrance Pupil Diameter` set to `0.25`.
7. Verify the Half-Field modal shows `90` degree angle fields with `[0, 0.707, 1]` relative values and wide-angle mode enabled.
8. Verify the wavelength modal shows the expected three wavelengths, weights, and reference wavelength.

## Notes

- The test reads the prescription grid after `Update System` to ensure the imported model survives the compute cycle. Worker-computed semi-diameters displayed in auto-aperture mode are validated numerically to three decimal places, so meaningful result changes fail without making full-precision serialization part of the UI contract.
- The final surface thickness assertion uses the full stored numeric string because the imported JSON contains a long floating-point value.
- Prescription row assertions identify each surface by its displayed `Index` value, then read cells from the matching center-row container so the pinned `Index` column does not create duplicate-row selector failures.
*/
import path from "path";
import { test, expect } from "./fixtures";
import {
  dismissAnyOpenDialog,
  getGridCellByHeaderText,
  getPrescriptionActionButton,
  getPrescriptionSurfaceRow,
} from "./utils";

const expectedSurfaces = [
  ["Default", "4.7745", "0.1299", "1.713", 1.75],
  ["Default", "0.8821", "0.5688", "air", 0.88],
  ["Default", "1.6822", "0.0938", "1.618", 0.883],
  ["Default", "0.8064", "0.3313", "air", 0.735],
  ["Default", "1.6265", "0.4838", "1.595", 0.6],
  ["Default", "-0.7284", "0.0938", "1.623", 0.6],
  ["Default", "8.3331", "0.05", "air", 0.6],
  ["Default", "7.6334", "0.1875", "1.805", 0.6],
  ["Default", "0", "0.0806", "air", 0.6],
  ["Default", "0", "0.0938", "1.581", 0.6],
  ["Default", "0", "0.1413", "air", 0.6],
  ["Stop", "0", "0.1", "air", 0.284],
  ["Default", "-2.8724", "0.05", "1.713", 0.6],
  ["Default", "2.8034", "0.25", "1.64", 0.6],
  ["Default", "-1.1513", "0.0063", "air", 0.6],
  ["Default", "3.2583", "0.2919", "1.488", 0.6],
  ["Default", "-0.8827", "0.0913", "1.805", 0.6],
  ["Default", "-1.7116", "2.8885085903779517", "air", 0.6],
] as const;

test("import fisheye config, update system, and verify loaded prescription/specs", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('button[aria-label="Load Config"]').click(),
  ]);
  await fileChooser.setFiles(
    path.join(__dirname, "jsons", "fisheye-lens-config.json")
  );

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  await dialog.getByRole("button", { name: "Load" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5_000 });

  const updateBtn = page.locator('button[aria-label="Update System"]');
  await updateBtn.click();
  await expect(updateBtn).toBeDisabled({ timeout: 5_000 });
  await expect(updateBtn).toBeEnabled({ timeout: 60_000 });

  const autoSemiDiameterSwitch = page.getByRole("switch", {
    name: "Set auto aperture dimensions",
  });
  await expect(autoSemiDiameterSwitch).toBeChecked();
  await expect(autoSemiDiameterSwitch).toHaveText("Auto");

  const prescGrid = '[aria-label="Lens prescription editor"]';

  for (const [index, surface] of expectedSurfaces.entries()) {
    const surfaceIndex = index + 1;
    const row = await getPrescriptionSurfaceRow(page, prescGrid, surfaceIndex);

    await expect(
      await getGridCellByHeaderText(page, prescGrid, row, "Surface")
    ).toContainText(surface[0]);
    await expect(
      await getGridCellByHeaderText(page, prescGrid, row, "Radius of Curvature")
    ).toContainText(surface[1]);
    await expect(
      await getGridCellByHeaderText(page, prescGrid, row, "Thickness")
    ).toContainText(surface[2]);
    await expect(
      await getGridCellByHeaderText(page, prescGrid, row, "Medium")
    ).toContainText(surface[3]);
    const semiDiameterCell = await getGridCellByHeaderText(
      page,
      prescGrid,
      row,
      "Semi-diam."
    );
    const semiDiameter = Number.parseFloat(await semiDiameterCell.innerText());
    expect(Number.isFinite(semiDiameter)).toBe(true);
    expect(semiDiameter).toBeCloseTo(surface[4], 3);

    await row.hover();
    await expect(
      await getPrescriptionActionButton(
        page,
        prescGrid,
        surfaceIndex,
        "Asph.",
        "Edit aspherical parameters"
      )
    ).toHaveText("None");
    await expect(
      await getPrescriptionActionButton(
        page,
        prescGrid,
        surfaceIndex,
        "Tilt & Decenter",
        "Edit decenter and tilt"
      )
    ).toHaveText("None");
  }

  await page.getByRole("tab", { name: "System Specs" }).click();
  await expect(
    page.locator('[aria-label="System aperture type"]')
  ).toHaveValue("object:epd");
  await expect(page.locator('[aria-label="Aperture value"]')).toHaveValue(
    "0.25"
  );

  await page.getByLabel("Configure field").click();
  const fieldModal = page.getByRole("dialog", { name: "Half-Field" });
  await fieldModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(page.getByLabel("Field type")).toHaveValue("angle");
  await expect(page.getByLabel("Max half-field value")).toHaveValue("90");
  await expect(
    page.getByLabel("Use wide angle mode for more robust ray aiming")
  ).toBeChecked();

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

  await page.getByLabel("Configure wavelengths").click();
  const wavelengthModal = page.getByRole("dialog", { name: "Wavelengths" });
  await wavelengthModal.waitFor({ state: "visible", timeout: 5_000 });
  const wavelengthGrid =
    '[role="dialog"][aria-labelledby="wavelength-modal-title"]';

  await expect(
    page.locator(
      `${wavelengthGrid} .ag-row[row-index="0"] .ag-cell[col-id="wavelength"]`
    )
  ).toContainText("486.133");
  await expect(
    page.locator(
      `${wavelengthGrid} .ag-row[row-index="0"] .ag-cell[col-id="weight"]`
    )
  ).toContainText("1");
  await expect(
    page.locator(
      `${wavelengthGrid} .ag-row[row-index="1"] .ag-cell[col-id="wavelength"]`
    )
  ).toContainText("546.073");
  await expect(
    page.locator(
      `${wavelengthGrid} .ag-row[row-index="1"] .ag-cell[col-id="weight"]`
    )
  ).toContainText("2");
  await expect(
    page.locator(
      `${wavelengthGrid} .ag-row[row-index="2"] .ag-cell[col-id="wavelength"]`
    )
  ).toContainText("656.273");
  await expect(
    page.locator(
      `${wavelengthGrid} .ag-row[row-index="2"] .ag-cell[col-id="weight"]`
    )
  ).toContainText("1");
  await expect(
    page.locator('input[type="radio"][aria-label="Reference wavelength 2"]')
  ).toBeChecked();
  await wavelengthModal.getByRole("button", { name: "Cancel" }).click();
  await wavelengthModal.waitFor({ state: "hidden", timeout: 5_000 });
});
