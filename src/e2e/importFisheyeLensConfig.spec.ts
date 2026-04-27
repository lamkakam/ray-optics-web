import path from "path";
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog, getColId } from "./utils";

const expectedSurfaces = [
  ["Default", "4.7745", "0.1299", "1.713", "2"],
  ["Default", "0.8821", "0.5688", "air", "0.88"],
  ["Default", "1.6822", "0.0938", "1.618", "0.95"],
  ["Default", "0.8064", "0.3313", "air", "0.725"],
  ["Default", "1.6265", "0.4838", "1.595", "0.6"],
  ["Default", "-0.7284", "0.0938", "1.623", "0.6"],
  ["Default", "8.3331", "0.05", "air", "0.6"],
  ["Default", "7.6334", "0.1875", "1.805", "0.6"],
  ["Default", "0", "0.0806", "air", "0.6"],
  ["Default", "0", "0.0938", "1.581", "0.6"],
  ["Default", "0", "0.1413", "air", "0.6"],
  ["Stop", "0", "0.1", "air", "0.284"],
  ["Default", "-2.8724", "0.05", "1.713", "0.6"],
  ["Default", "2.8034", "0.25", "1.64", "0.6"],
  ["Default", "-1.1513", "0.0063", "air", "0.6"],
  ["Default", "3.2583", "0.2919", "1.488", "0.6"],
  ["Default", "-0.8827", "0.0913", "1.805", "0.6"],
  ["Default", "-1.7116", "2.8885085903779517", "air", "0.6"],
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

  await expect(page.getByRole("button", { name: "Semi-diameter" })).toHaveText(
    "Auto"
  );

  const prescGrid = '[aria-label="Lens prescription editor"]';
  const colIdSurface = await getColId(page, prescGrid, "Surface");
  const colIdRadius = await getColId(page, prescGrid, "Radius of Curvature");
  const colIdThickness = await getColId(page, prescGrid, "Thickness");
  const colIdMedium = await getColId(page, prescGrid, "Medium");
  const colIdSemiDiam = await getColId(page, prescGrid, "Semi-diam.");

  for (const [index, surface] of expectedSurfaces.entries()) {
    const rowIndex = index + 1;
    const row = page.locator(`${prescGrid} .ag-row[row-index="${rowIndex}"]`);

    await expect(
      row.locator(`.ag-cell[col-id="${colIdSurface}"]`)
    ).toContainText(surface[0]);
    await expect(
      row.locator(`.ag-cell[col-id="${colIdRadius}"]`)
    ).toContainText(surface[1]);
    await expect(
      row.locator(`.ag-cell[col-id="${colIdThickness}"]`)
    ).toContainText(surface[2]);
    await expect(
      row.locator(`.ag-cell[col-id="${colIdMedium}"]`)
    ).toContainText(surface[3]);
    await expect(
      row.locator(`.ag-cell[col-id="${colIdSemiDiam}"]`)
    ).toContainText(surface[4]);

    await row.hover();
    await expect(
      row.locator('[aria-label="Edit aspherical parameters"]')
    ).toHaveText("None");
    await expect(
      row.locator('[aria-label="Edit decenter and tilt"]')
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
  const fieldModal = page.getByRole("dialog", { name: "Field" });
  await fieldModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(page.getByLabel("Field type")).toHaveValue("angle");
  await expect(page.getByLabel("Max field value")).toHaveValue("90");
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
