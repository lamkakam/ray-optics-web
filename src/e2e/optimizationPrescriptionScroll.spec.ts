/**
 * Verifies that the mounted Optimization prescription grid retains its vertical
 * scroll position while radius and thickness modes change through the GUI.
 * Imports the fisheye fixture at desktop and smaller-screen widths, then checks
 * C → V → C and C → P → C on a later surface. Every confirmation must close the
 * dialog, update the indicator, preserve scroll after rendering settles, and
 * restore the saved selection when reopened. Cancel must discard draft changes
 * while preserving the saved mode and scroll position.
 */
import path from "node:path";
import { test, expect, type Locator } from "@playwright/test";
import { waitForPyodide } from "./utils";

/** Samples subsequent frames so a deferred row-data update cannot escape the scroll assertion. */
async function expectScrollPreserved(
  viewport: Locator,
  expectedScrollTop: number,
): Promise<void> {
  expect(expectedScrollTop).toBeGreaterThan(0);
  const offsets = await viewport.evaluate(async (element) => {
    const samples: number[] = [];
    for (let frame = 0; frame < 30; frame += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      samples.push(element.scrollTop);
    }
    return samples;
  });
  expect(offsets).toEqual(Array.from({ length: 30 }, () => expectedScrollTop));
}

for (const viewportSize of [
  { width: 1600, height: 900 },
  { width: 1024, height: 768 },
]) {
  test.describe(`${viewportSize.width}px prescription grid`, () => {
    test.use({ viewport: viewportSize });

    for (const parameter of ["Radius", "Thickness"] as const) {
      test(`preserves scroll when confirming and cancelling ${parameter.toLowerCase()} modes`, async ({
        page,
      }) => {
        await page.goto("/");
        await waitForPyodide(page);
        const [fileChooser] = await Promise.all([
          page.waitForEvent("filechooser"),
          page
            .getByRole("button", { name: "Load Config", exact: true })
            .click(),
        ]);
        await fileChooser.setFiles(
          path.join(__dirname, "jsons", "fisheye-lens-config.json"),
        );
        const loadDialog = page.getByRole("dialog");
        await loadDialog
          .getByRole("button", { name: "Load", exact: true })
          .click();
        await expect(loadDialog).toBeHidden();

        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("link", { name: "Optimization", exact: true })
          .click();
        await page.getByRole("tab", { name: "Lens Prescription" }).click();

        const grid = page.getByTestId("optimization-lens-prescription-grid");
        const viewport = grid.locator(".ag-body-viewport");
        await viewport.hover();
        await page.mouse.wheel(0, 1200);
        await expect
          .poll(() => viewport.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        const modeButton = grid.getByRole("button", {
          name: `${parameter} mode for surface 17`,
          exact: true,
        });
        await modeButton.scrollIntoViewIfNeeded();
        await expect(modeButton).toHaveText("C");
        const scrollTop = await viewport.evaluate(
          (element) => element.scrollTop,
        );
        await expectScrollPreserved(viewport, scrollTop);

        const dialog = page.getByRole("dialog", {
          name: `${parameter} Variable / Pickup`,
        });
        const modeSelect = dialog.getByRole("combobox", {
          name: `${parameter} mode`,
          exact: true,
        });

        for (const mode of [
          "variable",
          "constant",
          "pickup",
          "constant",
        ] as const) {
          await test.step(`confirm ${mode} and discard an unsaved change`, async () => {
            await modeButton.click();
            await modeSelect.selectOption(mode);
            if (mode === "variable") {
              await dialog
                .getByLabel(/Min\.$/)
                .fill(parameter === "Radius" ? "-1" : "0.05");
              await dialog
                .getByLabel(/Max\.$/)
                .fill(parameter === "Radius" ? "-0.5" : "0.15");
            }
            if (mode === "pickup") {
              await dialog
                .getByRole("combobox", { name: "Source surface" })
                .selectOption("16");
            }
            await dialog.getByRole("button", { name: "Confirm" }).click();
            await expect(dialog).toBeHidden();
            await expectScrollPreserved(viewport, scrollTop);
            await expect(modeButton).toHaveText(mode[0].toUpperCase());

            await modeButton.click();
            await expect(modeSelect).toHaveValue(mode);
            if (mode === "pickup") {
              await expect(
                dialog.getByRole("combobox", { name: "Source surface" }),
              ).toHaveValue("16");
            }
            await modeSelect.selectOption(
              mode === "constant" ? "variable" : "constant",
            );
            await dialog.getByRole("button", { name: "Cancel" }).click();
            await expect(dialog).toBeHidden();
            await expect(modeButton).toHaveText(mode[0].toUpperCase());
            await expectScrollPreserved(viewport, scrollTop);

            await modeButton.click();
            await expect(modeSelect).toHaveValue(mode);
            await dialog.getByRole("button", { name: "Cancel" }).click();
            await expect(dialog).toBeHidden();
            await expectScrollPreserved(viewport, scrollTop);
          });
        }
      });
    }
  });
}
