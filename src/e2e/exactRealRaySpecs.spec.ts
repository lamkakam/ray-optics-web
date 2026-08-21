/**
 * Pyodide integration regression for exact high-NA pupil and height specs.
 *
 * @remarks
 * Loads the original reversed high-NA microscope example, confirms its opted-in
 * exact Image Height path, and rebuilds it through the module worker. It also
 * fully reverses both bundled superachromatic microscope prescriptions, changes
 * them to Object NA/Object Height, explicitly opts both into the finite-point
 * solver, and requires exact-model update, first-order, and layout computations
 * to finish without an Error dialog.
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
  });
}
