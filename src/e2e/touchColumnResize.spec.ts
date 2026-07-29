/**
 * Verifies native viewport panning styles and touchscreen column resizing on a real AG Grid.
 *
 * @remarks
 * ## Coverage
 *
 * - Creates a touch-enabled Chromium browser context.
 * - Asserts the computed `touch-action` and `overscroll-behavior` on the header, body, and center-column viewports.
 * - Drags the resizable `Surface` header handle with touch pointer events.
 * - Asserts that the rendered header width increases after the drag.
 */
import { test, expect } from "@playwright/test";
import { waitForPyodide } from "./utils";

test("allows native viewport panning and resizes a column with a touchscreen drag", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await waitForPyodide(page);
    await page.getByRole("tab", { name: "Prescription" }).click();

    const grid = page.locator('[aria-label="Lens prescription editor"]');
    for (const selector of [
      ".ag-header-viewport",
      ".ag-body-viewport",
      ".ag-center-cols-viewport",
    ]) {
      const viewport = grid.locator(selector);
      await expect(viewport).toHaveCount(1);
      await expect(viewport).toHaveCSS("touch-action", "pan-x pan-y");
      await expect(viewport).toHaveCSS("overscroll-behavior", "auto");
    }

    const header = grid
      .locator(".ag-header-cell-text")
      .getByText("Surface", { exact: true })
      .locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' ag-header-cell ')]");
    const resizeHandle = header.locator(".ag-header-cell-resize");
    await expect(resizeHandle).toBeVisible();

    const initialWidth = await header.evaluate((element) => element.getBoundingClientRect().width);
    const box = await resizeHandle.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;
    const pointer = {
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      bubbles: true,
      cancelable: true,
    };

    await resizeHandle.dispatchEvent("pointerdown", { ...pointer, clientX: startX, clientY: startY, buttons: 1 });
    await page.locator("body").dispatchEvent("pointermove", {
      ...pointer,
      clientX: startX + 60,
      clientY: startY,
      buttons: 1,
    });
    await page.locator("body").dispatchEvent("pointerup", {
      ...pointer,
      clientX: startX + 60,
      clientY: startY,
      buttons: 0,
    });

    await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(
      initialWidth + 40,
    );
  } finally {
    await context.close();
  }
});
