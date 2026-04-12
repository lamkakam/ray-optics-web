import path from "path";
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog, getColId } from "./utils";

test("import transmissive diffraction grating config and verify grating plus tilt/decenter", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  await page.getByRole("tab", { name: "Prescription" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('button[aria-label="Load Config"]').click(),
  ]);
  await fileChooser.setFiles(
    path.join(__dirname, "jsons", "transmissive-diffraction-grating.json")
  );

  const importDialog = page.getByRole("dialog");
  await importDialog.waitFor({ state: "visible", timeout: 5_000 });
  await importDialog.getByRole("button", { name: "Load" }).click();
  await importDialog.waitFor({ state: "hidden", timeout: 5_000 });

  const prescriptionGrid = '[aria-label="Lens prescription editor"]';
  const surfaceColId = await getColId(page, prescriptionGrid, "Surface");
  const mediumColId = await getColId(page, prescriptionGrid, "Medium");
  const decenterColId = await getColId(page, prescriptionGrid, "Tilt & Decenter");
  const diffractionGratingColId = await getColId(
    page,
    prescriptionGrid,
    "Diffraction Grating"
  );

  const decenterRow4 = page
    .locator(`${prescriptionGrid} .ag-row[row-index="4"]:not(.ag-opacity-zero)`)
    .first();
  const gratingRow6 = page
    .locator(`${prescriptionGrid} .ag-row[row-index="6"]:not(.ag-opacity-zero)`)
    .first();
  const decenterRow9 = page
    .locator(`${prescriptionGrid} .ag-row[row-index="9"]:not(.ag-opacity-zero)`)
    .first();
  const decenterButtonRow4 = decenterRow4
    .locator(`.ag-cell[col-id="${decenterColId}"]`)
    .getByRole("button", { name: "Edit decenter and tilt" })
    .first();
  const diffractionGratingButtonRow6 = gratingRow6
    .locator(`.ag-cell[col-id="${diffractionGratingColId}"]`)
    .getByRole("button", { name: "Edit diffraction grating" })
    .first();
  const decenterButtonRow9 = decenterRow9
    .locator(`.ag-cell[col-id="${decenterColId}"]`)
    .getByRole("button", { name: "Edit decenter and tilt" })
    .first();

  await expect(
    decenterRow4.locator(`.ag-cell[col-id="${surfaceColId}"]`)
  ).toContainText("Default");
  await expect(
    decenterButtonRow4
  ).toHaveText("Set");

  await expect(
    gratingRow6.locator(`.ag-cell[col-id="${mediumColId}"]`)
  ).toContainText("SF10");
  await expect(
    diffractionGratingButtonRow6
  ).toHaveText("Set");

  await expect(
    decenterRow9.locator(`.ag-cell[col-id="${surfaceColId}"]`)
  ).toContainText("Default");
  await expect(
    decenterButtonRow9
  ).toHaveText("Set");

  await diffractionGratingButtonRow6.hover();
  await diffractionGratingButtonRow6.click();
  const gratingModal = page.locator(
    '[role="dialog"][aria-labelledby="diffraction-grating-modal-title"]'
  );
  await gratingModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(gratingModal.getByLabel("lp/mm")).toHaveValue("600");
  await expect(gratingModal.getByLabel("order")).toHaveValue("1");
  await gratingModal.getByRole("button", { name: "Cancel" }).click();
  await gratingModal.waitFor({ state: "hidden", timeout: 5_000 });

  const decenterModal = page.locator(
    '[role="dialog"][aria-labelledby="decenter-modal-title"]'
  );

  await decenterButtonRow4.hover();
  await decenterButtonRow4.click();
  await decenterModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(
    decenterModal.getByLabel("Coordinate system for this and following surfaces")
  ).toHaveValue("dec and return");
  await expect(decenterModal.getByLabel("Alpha (°)")).toHaveValue("15");
  await expect(decenterModal.getByLabel("Beta (°)")).toHaveValue("0");
  await expect(decenterModal.getByLabel("Gamma (°)")).toHaveValue("0");
  await expect(decenterModal.getByLabel("Offset X")).toHaveValue("0");
  await expect(decenterModal.getByLabel("Offset Y")).toHaveValue("0");
  await decenterModal.getByRole("button", { name: "Cancel" }).click();
  await decenterModal.waitFor({ state: "hidden", timeout: 5_000 });

  await decenterButtonRow9.hover();
  await decenterButtonRow9.click();
  await decenterModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(
    decenterModal.getByLabel("Coordinate system for this and following surfaces")
  ).toHaveValue("dec and return");
  await expect(decenterModal.getByLabel("Alpha (°)")).toHaveValue("-15");
  await expect(decenterModal.getByLabel("Beta (°)")).toHaveValue("0");
  await expect(decenterModal.getByLabel("Gamma (°)")).toHaveValue("0");
  await expect(decenterModal.getByLabel("Offset X")).toHaveValue("0");
  await expect(decenterModal.getByLabel("Offset Y")).toHaveValue("0");
  await decenterModal.getByRole("button", { name: "Cancel" }).click();
  await decenterModal.waitFor({ state: "hidden", timeout: 5_000 });
});
