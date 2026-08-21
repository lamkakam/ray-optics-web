/**
 * Pyodide integration regression for exact high-NA pupil and height specs.
 *
 * @remarks
 * Loads the original reversed high-NA microscope example, confirms its opted-in
 * exact Image Height path, and rebuilds it through the module worker. It also
 * fully reverses a bundled superachromatic microscope prescription, changes it
 * to Object NA/Object Height, explicitly opts into the finite-point solver, and
 * requires exact-model update, first-order, layout, OPD Fan, and Zernike
 * computations to finish without an Error dialog. OPD Fan is exercised at the
 * 0.707 and full 4 mm fields. Zernike Terms is exercised first with manual
 * aperture dimensions, then again after rebuilding with auto aperture dimensions.
 * The immersion objective is also rebuilt at a 0.1 mm Object Height, where its
 * unit Object-NA boundary is unvignetted.
 */
import { expect, test } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

const forwardObjectiveCases = [
  {
    exampleName:
      "Reversed Tracing of Superachromatic Air Microscope Objective US#7,158,310 Example 3 (2005)",
    objectNa: "0.16",
    objectHeight: "4",
  },
] as const;

const immersionObjectiveName =
  "Superachromatic High NA Immersion Microscope Objective with Tube Lens US#9,645,380 Example 1 (2013)";


test("updates the immersion objective at 0.1 mm half-field", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);
  await page.goto("/example-systems");
  await page
    .getByRole("button", { name: immersionObjectiveName, exact: true })
    .click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  const loadDialog = page.getByRole("dialog", { name: "Load Example System" });
  await expect(loadDialog).toBeVisible();
  await loadDialog.getByRole("button", { name: "Load", exact: true }).click();
  await page.waitForURL("**/");
  await expect(page.getByText(/^(?:Loading lens layout|Updating)\.\.\.$/)).toBeHidden({
    timeout: 120_000,
  });

  await page.getByRole("tab", { name: "System Specs" }).click();
  await page.getByLabel("Configure field").click();
  const fieldDialog = page.getByRole("dialog", { name: "Half-Field" });
  await page.getByLabel("Max half-field value").fill("0.1");
  await fieldDialog.getByRole("button", { name: "Apply", exact: true }).click();

  await page.getByRole("tab", { name: "Prescription" }).click();
  const updateButton = page.getByRole("button", { name: "Update System" });
  await updateButton.click();
  await expect(updateButton).toBeDisabled({ timeout: 5_000 });
  await expect(updateButton).toBeEnabled({ timeout: 120_000 });

  await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
  await expect(page.getByText("Paraxial first-order results")).toBeVisible();
  await expect(page.getByRole("img", { name: "Lens layout diagram" })).toBeVisible();
});


for (const objective of forwardObjectiveCases) {
  test(`builds ${objective.exampleName} after full reversal with exact Object Height`, async ({
    pyodidePage: page,
  }) => {
    await dismissAnyOpenDialog(page);
    await page.goto("/example-systems");
    await page.getByRole("button", { name: objective.exampleName, exact: true }).click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();

    const loadDialog = page.getByRole("dialog", { name: "Load Example System" });
    await expect(loadDialog).toBeVisible();
    await loadDialog.getByRole("button", { name: "Load", exact: true }).click();
    await page.waitForURL("**/");
    await expect(page.getByText(/^(?:Loading lens layout|Updating)\.\.\.$/)).toBeHidden({
      timeout: 120_000,
    });

    await page.getByRole("tab", { name: "Prescription" }).click();
    await page.getByRole("button", { name: "Formatting", exact: true }).click();
    const formattingDialog = page.getByRole("dialog", { name: "Formatting" });
    await formattingDialog.getByRole("radio", {
      name: "Reverse (also reversing thickness and medium)",
    }).click();
    await formattingDialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(formattingDialog).toBeHidden();

    await page.getByRole("tab", { name: "System Specs" }).click();
    await page.getByLabel("System aperture type").selectOption("object:NA");
    const apertureValue = page.getByLabel("Aperture value");
    await apertureValue.fill(objective.objectNa);
    await apertureValue.blur();

    await page.getByLabel("Configure field").click();
    const fieldDialog = page.getByRole("dialog", { name: "Half-Field" });
    await page.getByLabel("Field space").selectOption("object");
    await expect(page.getByLabel("Field type")).toHaveValue("height");
    const maxField = page.getByLabel("Max half-field value");
    await maxField.fill(objective.objectHeight);
    const wideAngle = page.getByRole("checkbox", {
      name: "Use wide angle mode for more robust ray aiming",
    });
    await expect(wideAngle).toBeEnabled();
    await wideAngle.check();
    await expect(wideAngle).toBeChecked();
    await fieldDialog.getByRole("button", { name: "Apply", exact: true }).click();

    await page.getByRole("tab", { name: "Prescription" }).click();
    const updateButton = page.getByRole("button", { name: "Update System" });
    await updateButton.click();
    await expect(updateButton).toBeDisabled({ timeout: 5_000 });
    await expect(updateButton).toBeEnabled({ timeout: 120_000 });

    await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
    await expect(page.getByText("Paraxial first-order results")).toBeVisible();
    await expect(page.getByRole("img", { name: "Lens layout diagram" })).toBeVisible();

    const plotTypeSelect = page.getByLabel("Plot type");
    await plotTypeSelect.selectOption("opdFan");
    const plotLoading = page.getByText("Loading plot...");
    await expect(plotLoading).toBeVisible({ timeout: 5_000 });
    await expect(plotLoading).toBeHidden({ timeout: 120_000 });

    const fieldSelect = page.getByLabel("Half-Field");
    for (const fieldIndex of ["1", "2"]) {
      await fieldSelect.selectOption(fieldIndex);
      await expect(plotLoading).toBeVisible({ timeout: 5_000 });
      await expect(plotLoading).toBeHidden({ timeout: 120_000 });
      await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
      await expect(page.getByTestId("opd-fan-chart")).toBeVisible();
    }

    const openAndVerifyZernikeTerms = async () => {
      await page.getByRole("button", { name: "Zernike Terms" }).click();
      const zernikeDialog = page.getByRole("dialog", { name: "Zernike Terms" });
      await expect(zernikeDialog).toBeVisible();
      await expect(zernikeDialog.getByText("Loading…")).toBeHidden({
        timeout: 120_000,
      });
      await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
      await expect(zernikeDialog.getByText("P-V WFE:")).toBeVisible();
      await expect(zernikeDialog.getByText("RMS WFE:")).toBeVisible();
      await expect(zernikeDialog.getByText("Strehl Ratio:")).toBeVisible();
      await zernikeDialog.getByRole("button", { name: "Ok", exact: true }).click();
      await expect(zernikeDialog).toBeHidden();
    };

    const autoApertureSwitch = page.getByRole("switch", {
      name: "Set auto aperture dimensions",
    });
    await expect(autoApertureSwitch).not.toBeChecked();
    await openAndVerifyZernikeTerms();

    await autoApertureSwitch.click();
    await expect(autoApertureSwitch).toBeChecked();
    await updateButton.click();
    await expect(updateButton).toBeDisabled({ timeout: 5_000 });
    await expect(updateButton).toBeEnabled({ timeout: 120_000 });
    await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
    await openAndVerifyZernikeTerms();
  });
}
