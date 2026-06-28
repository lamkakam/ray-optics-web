import path from "path";
import { test, expect } from "./fixtures";
import {
  dismissAnyOpenDialog,
  getPrescriptionActionButton,
  getPrescriptionCell,
  getPrescriptionSpecialCell,
} from "./utils";

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

  await expect(
    await getPrescriptionSpecialCell(page, prescriptionGrid, "Object", "Medium")
  ).toContainText("air");

  const decenterButtonRow4 = await getPrescriptionActionButton(
    page,
    prescriptionGrid,
    4,
    "Tilt & Decenter",
    "Edit decenter and tilt"
  );
  const diffractionGratingButtonRow6 = await getPrescriptionActionButton(
    page,
    prescriptionGrid,
    6,
    "Diffraction Grating",
    "Edit diffraction grating"
  );
  const decenterButtonRow9 = await getPrescriptionActionButton(
    page,
    prescriptionGrid,
    9,
    "Tilt & Decenter",
    "Edit decenter and tilt"
  );
  const decenterCellRow4 = await getPrescriptionCell(
    page,
    prescriptionGrid,
    4,
    "Tilt & Decenter"
  );
  const diffractionGratingCellRow6 = await getPrescriptionCell(
    page,
    prescriptionGrid,
    6,
    "Diffraction Grating"
  );

  await expect(
    await getPrescriptionCell(page, prescriptionGrid, 4, "Surface")
  ).toContainText("Default");
  await expect(decenterButtonRow4).toHaveText("dec and return");

  await expect(
    await getPrescriptionCell(page, prescriptionGrid, 6, "Medium")
  ).toContainText("SF10");
  await expect(diffractionGratingButtonRow6).toHaveText("600 lp/mm");

  await expect(
    await getPrescriptionCell(page, prescriptionGrid, 9, "Surface")
  ).toContainText("Default");
  await expect(decenterButtonRow9).toHaveText("dec and return");

  await diffractionGratingCellRow6.hover();
  await diffractionGratingCellRow6.click();
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

  await decenterCellRow4.hover();
  await decenterCellRow4.click();
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
