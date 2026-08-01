/**
 * Pyodide integration regression for exact high-NA pupil and image-height specs.
 *
 * @remarks
 * Loads the original reversed high-NA microscope example without the separate
 * object-space workaround, confirms the corrected geometric labels and valid
 * field choices, then rebuilds it through the module worker.  A successful
 * layout proves the wheel-backed exact model path ran before real-ray
 * vignetting and downstream analysis.
 */
import { expect, test } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

const exampleName =
  "Reversed Tracing of Superachromatic High NA Immersion Microscope Objective US#9,645,380 Example 1 (2013)";

test("builds the original high-NA microscope with exact real-ray specs", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);
  await page.goto("/example-systems");
  await page.getByRole("button", { name: exampleName, exact: true }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  const loadDialog = page.getByRole("dialog", { name: "Load Example System" });
  await expect(loadDialog).toBeVisible();
  await loadDialog.getByRole("button", { name: "Load", exact: true }).click();

  await page.waitForURL("**/");
  await expect(page.getByText(/^(?:Loading lens layout|Updating)\.\.\.$/)).toBeHidden({
    timeout: 120_000,
  });
  await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();

  await page.getByRole("tab", { name: "System Specs" }).click();
  const apertureType = page.locator('[aria-label="System aperture type"]');
  await expect(apertureType).toHaveValue("image:f/#");
  await expect(apertureType.locator("option:checked")).toHaveText(
    "Image Space Geometric F/#",
  );
  await expect(page.locator('[aria-label="Aperture value"]')).toHaveValue(
    "0.319",
  );

  await page.getByLabel("Configure field").click();
  const fieldDialog = page.getByRole("dialog", { name: "Half-Field" });
  await expect(fieldDialog).toBeVisible();
  await expect(page.getByLabel("Field space")).toHaveValue("image");
  await expect(page.getByLabel("Field type")).toHaveValue("height");
  await expect(page.getByLabel("Field type").locator("option")).toHaveText([
    "Height",
  ]);
  await expect(page.getByLabel("Max half-field value")).toHaveValue("0.3125");
  await fieldDialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("tab", { name: "Prescription" }).click();
  const updateButton = page.getByRole("button", { name: "Update System" });
  await expect(updateButton).toBeEnabled();
  await updateButton.click();
  await expect(updateButton).toBeDisabled({ timeout: 5_000 });
  await expect(updateButton).toBeEnabled({ timeout: 120_000 });

  await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
  await expect(page.getByText("Paraxial first-order results")).toBeVisible();
  await expect(page.getByRole("img", { name: "Lens layout diagram" })).toBeVisible();
});
