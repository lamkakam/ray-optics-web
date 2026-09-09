/**
 * Real Pyodide regression for the unchanged manual-aperture immersion objective.
 * At its exact relative fields sqrt(1/2) and 1 (0.3125 mm maximum), the
 * chief-ray reference projection rejects orientation reversals. Each failure
 * must stop loading, clear results, and allow recovery to the on-axis field
 * without an uncaught promise or closing the Zernike dialog.
 */
import { expect, test } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

test("recovers from immersion objective Zernike folds at both off-axis fields", async ({ pyodidePage: page }) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await dismissAnyOpenDialog(page);
  await page.goto("/example-systems");
  await page.getByRole("button", {
    name: "Superachromatic High NA Immersion Microscope Objective with Tube Lens US#9,645,380 Example 1 (2013)",
    exact: true,
  }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("dialog", { name: "Load Example System" }).getByRole("button", { name: "Load", exact: true }).click();
  await page.waitForURL("**/");
  await expect(page.getByText(/^(?:Loading lens layout|Updating)\.\.\.$/)).toBeHidden({ timeout: 120_000 });
  await page.getByRole("button", { name: "Zernike Terms", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Zernike Terms" });
  await expect(dialog.getByRole("table")).toBeVisible({ timeout: 120_000 });
  await expect(dialog.getByLabel("Wavelength")).toHaveValue("0");
  for (const field of ["1", "2"]) {
    await dialog.getByLabel("Half-Field").selectOption(field);
    const error = page.getByRole("dialog", { name: "Error", exact: true });
    await expect(error).toBeVisible({ timeout: 120_000 });
    await expect(error).toContainText("Zernike calculation failed");
    await expect(error).toContainText("fold or orientation reversal");
    await expect(dialog.getByRole("table")).toBeHidden();
    await expect(dialog.getByText("Loading…")).toBeHidden();
    await error.getByRole("button", { name: "OK", exact: true }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Half-Field").selectOption("0");
    await expect(dialog.getByRole("table")).toBeVisible({ timeout: 120_000 });
    await expect(dialog.getByText("RMS WFE:")).toBeVisible();
    await expect(error).toBeHidden();
  }
  await dialog.getByRole("button", { name: "Ok", exact: true }).click();
  expect(errors).toEqual([]);
});
