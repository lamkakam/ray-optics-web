/**
 * Playwright end-to-end coverage that validates every bundled example system through the same visible controls used by a person.
 *
 * @remarks
 * ## Behavior
 *
 * - Opens `/example-systems` and discovers the complete rendered example list from the accessible UI; it does not import or inspect `ExampleSystemList`.
 * - For each displayed example, selects it, applies it, confirms the overwrite dialog, and waits for the automatic lens-layout computation to settle.
 * - Opens the Lens Editor's Prescription tab, clicks `Update System`, and waits for the button's disabled/enabled transition to prove the update started and finished.
 * - Asserts that no error dialog is displayed and that the lens-layout diagram is visible.
 * - Uses the side navigation to return to Example Systems before testing the next displayed item.
 * - Allows up to 15 minutes for the full catalogue while retaining 60-second per-computation limits.
 */
import { test, expect } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

test("every example system loads and updates successfully", async ({
  pyodidePage: page,
}) => {
  test.setTimeout(15 * 60_000);

  await dismissAnyOpenDialog(page);
  await page.goto("/example-systems");

  const exampleMenu = page.getByRole("list", { name: "Example systems" });
  const exampleNames = (await exampleMenu.getByRole("button").allTextContents())
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  expect(exampleNames.length).toBeGreaterThan(0);

  for (const [index, exampleName] of exampleNames.entries()) {
    await test.step(exampleName, async () => {
      await exampleMenu.getByRole("button", { name: exampleName, exact: true }).click();
      await page.getByRole("button", { name: "Apply", exact: true }).click();

      const loadDialog = page.getByRole("dialog", { name: "Load Example System" });
      await expect(loadDialog).toBeVisible();
      await loadDialog.getByRole("button", { name: "Load", exact: true }).click();

      await page.waitForURL("**/");
      await expect(page.getByText(/^(?:Loading lens layout|Updating)\.\.\.$/)).toBeHidden({
        timeout: 60_000,
      });
      await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();

      await page.getByRole("tab", { name: "Prescription" }).click();
      const updateButton = page.getByRole("button", { name: "Update System" });
      await expect(updateButton).toBeEnabled();
      await updateButton.click();
      await expect(updateButton).toBeDisabled({ timeout: 5_000 });
      await expect(updateButton).toBeEnabled({ timeout: 60_000 });

      await expect(page.getByRole("dialog", { name: "Error" })).toBeHidden();
      await expect(page.getByRole("img", { name: "Lens layout diagram" })).toBeVisible();

      if (index < exampleNames.length - 1) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page.getByRole("link", { name: "Example Systems" }).click();
        await page.waitForURL("**/example-systems");
      }
    });
  }
});
