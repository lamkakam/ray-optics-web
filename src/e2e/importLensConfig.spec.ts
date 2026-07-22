/**
End-to-end coverage for importing `lens-config.json` through the `Load Config` button and verifying the imported specs, prescription grid, modals, and update flow.

## Flow

1. Dismiss any startup dialog, load the JSON fixture, and confirm the import.
2. Verify imported system, aperture, Half-Field, and wavelength values through the Specs UI.
3. Verify the Prescription grid values for key rows, including visible aspherical/decenter text labels (`Conic`, `None`, `bend`, `decenter`, `reverse`).
4. Open the aspherical and decenter modals from prescription cells and verify the imported modal values.
5. Update the system and verify output metrics appear.

Prescription assertions resolve surface rows by displayed `Index` values and resolve the `Object`/`Image` rows by their displayed labels. The helpers bridge from AG Grid's pinned `Index` row to the matching center-row container before reading non-index cells or clicking action buttons.
*/
import path from "path";
import { test, expect } from "./fixtures";
import {
  dismissAnyOpenDialog,
  getPrescriptionActionButton,
  getPrescriptionCell,
  getPrescriptionSpecialActionButton,
  getPrescriptionSpecialCell,
  getPrescriptionSurfaceRow,
} from "./utils";

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
    name: "Half-Field",
  });
  await fieldModal.waitFor({ state: "visible", timeout: 3_000 });
  await expect(page.getByLabel("Field type")).toHaveValue("angle");
  await expect(page.getByLabel("Max half-field value")).toHaveValue("0.05");

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

  await expect(
    await getPrescriptionSpecialCell(page, prescGrid, "Object", "Medium")
  ).toContainText("air");

  // Row 1: Stop — aspherical + decenter
  await expect(
    await getPrescriptionCell(page, prescGrid, 1, "Surface")
  ).toContainText("Stop");
  await expect(
    await getPrescriptionCell(page, prescGrid, 1, "Radius of Curvature")
  ).toContainText("-24384");
  await expect(
    await getPrescriptionCell(page, prescGrid, 1, "Thickness")
  ).toContainText("-11600");
  await expect(
    await getPrescriptionCell(page, prescGrid, 1, "Medium")
  ).toContainText("REFL");
  await expect(
    await getPrescriptionCell(page, prescGrid, 1, "Semi-diam.")
  ).toContainText("609.6");

  const row1 = await getPrescriptionSurfaceRow(page, prescGrid, 1);
  await row1.hover();
  await expect(
    await getPrescriptionActionButton(
      page,
      prescGrid,
      1,
      "Asph.",
      "Edit aspherical parameters"
    )
  ).toHaveText("Conic");
  await expect(
    await getPrescriptionActionButton(
      page,
      prescGrid,
      1,
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).toHaveText("bend");

  // Row 3: Default, N-BK7, decenter only
  await expect(
    await getPrescriptionCell(page, prescGrid, 3, "Radius of Curvature")
  ).toContainText("0");
  await expect(
    await getPrescriptionCell(page, prescGrid, 3, "Thickness")
  ).toContainText("-9");
  await expect(
    await getPrescriptionCell(page, prescGrid, 3, "Medium")
  ).toContainText("N-BK7");

  const row3 = await getPrescriptionSurfaceRow(page, prescGrid, 3);
  await row3.hover();
  await expect(
    await getPrescriptionActionButton(
      page,
      prescGrid,
      3,
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).toHaveText("decenter");
  await expect(
    await getPrescriptionActionButton(
      page,
      prescGrid,
      3,
      "Asph.",
      "Edit aspherical parameters"
    )
  ).toHaveText("None");

  // Row 4: Default, R=-556.536, air, reverse decenter
  await expect(
    await getPrescriptionCell(page, prescGrid, 4, "Radius of Curvature")
  ).toContainText("-556.536");
  await expect(
    await getPrescriptionCell(page, prescGrid, 4, "Medium")
  ).toContainText("air");

  const row4 = await getPrescriptionSurfaceRow(page, prescGrid, 4);
  await row4.hover();
  await expect(
    await getPrescriptionActionButton(
      page,
      prescGrid,
      4,
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).toHaveText("reverse");

  // Row 7: Default, R=-514.2, N-BK7, decenter
  await expect(
    await getPrescriptionCell(page, prescGrid, 7, "Radius of Curvature")
  ).toContainText("-514.2");
  await expect(
    await getPrescriptionCell(page, prescGrid, 7, "Thickness")
  ).toContainText("-11");
  await expect(
    await getPrescriptionCell(page, prescGrid, 7, "Medium")
  ).toContainText("N-BK7");

  const row7 = await getPrescriptionSurfaceRow(page, prescGrid, 7);
  await row7.hover();
  await expect(
    await getPrescriptionActionButton(
      page,
      prescGrid,
      7,
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).toHaveText("decenter");

  // Row 10: Image — decenter set
  const row10 = await getPrescriptionSpecialCell(
    page,
    prescGrid,
    "Image",
    "Tilt & Decenter"
  );
  await row10.hover();
  await expect(
    await getPrescriptionSpecialActionButton(
      page,
      prescGrid,
      "Image",
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).toHaveText("decenter");

  // 7. Verify Aspherical modal for row 1 (Stop)
  await row1.hover();
  await (await getPrescriptionCell(page, prescGrid, 1, "Asph.")).click();
  const asphModal = page.locator('[role="dialog"][aria-labelledby="aspherical-modal-title"]');
  await asphModal.waitFor({ state: "visible", timeout: 5_000 });
  await expect(asphModal.getByLabel("Conic constant")).toHaveValue("-1");
  await expect(asphModal.getByLabel("Type")).toHaveValue("Conic");
  await asphModal.getByRole("button", { name: "Cancel" }).click();
  await asphModal.waitFor({ state: "hidden", timeout: 5_000 });

  // 8. Verify Decenter modal for row 1 (Stop — bend)
  await row1.hover();
  await (await getPrescriptionCell(page, prescGrid, 1, "Tilt & Decenter")).click();
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
  await (
    await getPrescriptionActionButton(
      page,
      prescGrid,
      3,
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).click();
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
  await (
    await getPrescriptionSpecialActionButton(
      page,
      prescGrid,
      "Image",
      "Tilt & Decenter",
      "Edit decenter and tilt"
    )
  ).click();
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
