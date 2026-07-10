import { test, expect } from "@playwright/test";
import { waitForPyodide } from "./utils";

test("resizes an AG Grid column with a touchscreen drag", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();

  try {
    await page.goto("/");
    await waitForPyodide(page);
    await page.getByRole("tab", { name: "Prescription" }).click();

    const header = page
      .locator('[aria-label="Lens prescription editor"] .ag-header-cell-text')
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
