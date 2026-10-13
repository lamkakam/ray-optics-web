/**
 * Verifies that a long Operand Evaluation table on the large-screen
 * Optimization page never pushes the bottom drawer past the viewport.
 *
 * @remarks
 * ## Flow
 *
 * 1. Load `jsons/singlet-lens-optimization-test.json` at a 1600×900 viewport and navigate to Optimization.
 * 2. Add a Ray Fan operand so the evaluation table has more rows than fit above the drawer.
 * 3. Check the layout at the default drawer height, then after keyboard-resizing the drawer to its maximum (`End`) and minimum (`Home`) heights, and after restoring a mid height with `ArrowUp`.
 *
 * ## Assertions
 *
 * - The drawer's bottom edge stays within the viewport, so its AG Grid content is never clipped.
 * - The evaluation card's bottom edge stays above the drawer's top edge.
 * - While the drawer is open at its default height, the evaluation body scrolls internally instead of growing the page.
 */
import path from "node:path";
import { test, expect, type Locator } from "@playwright/test";
import { getColId, selectGridOption, waitForPyodide } from "./utils";

const VIEWPORT = { width: 1600, height: 900 };

test.use({ viewport: VIEWPORT });

/** Asserts that the drawer is fully inside the viewport and the evaluation card ends above it. */
async function expectDrawerUnobstructed(
  drawer: Locator,
  evaluationCard: Locator,
): Promise<void> {
  await expect
    .poll(async () => {
      const drawerBox = await drawer.boundingBox();
      const cardBox = await evaluationCard.boundingBox();
      if (drawerBox === null || cardBox === null) return false;
      const drawerBottom = drawerBox.y + drawerBox.height;
      const cardBottom = cardBox.y + cardBox.height;
      return (
        drawerBottom <= VIEWPORT.height + 0.5 && cardBottom <= drawerBox.y + 0.5
      );
    })
    .toBe(true);
}

test("keeps the drawer fully visible when the evaluation table has many rows", async ({
  page,
}) => {
  await page.goto("/");
  await waitForPyodide(page);
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Load Config", exact: true }).click(),
  ]);
  await fileChooser.setFiles(
    path.join(__dirname, "jsons", "singlet-lens-optimization-test.json"),
  );
  const loadDialog = page.getByRole("dialog");
  await loadDialog.getByRole("button", { name: "Load", exact: true }).click();
  await expect(loadDialog).toBeHidden();

  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Optimization", exact: true }).click();

  await page.getByRole("tab", { name: "Operands" }).click();
  await page.getByRole("button", { name: "Add operand" }).click();
  const operandsGrid = '[data-testid="optimization-operands-tab"]';
  const operandKindCol = await getColId(page, operandsGrid, "Operand Kind");
  await selectGridOption(page, operandsGrid, 0, operandKindCol, "Ray Fan");

  const evaluationScroll = page.getByTestId("optimization-evaluation-scroll");
  await expect
    .poll(() => evaluationScroll.getByText("Ray Fan").count(), {
      timeout: 60_000,
    })
    .toBeGreaterThan(20);

  const evaluationCard = page
    .getByRole("heading", { name: "Operand Evaluation" })
    .locator("xpath=../..");
  const separator = page.getByRole("separator", { name: "Resize drawer" });
  const drawer = separator.locator("xpath=..");

  await expectDrawerUnobstructed(drawer, evaluationCard);
  expect(
    await evaluationScroll.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);

  for (const key of ["End", "Home", "ArrowUp"] as const) {
    await separator.focus();
    if (key === "ArrowUp") {
      for (let step = 0; step < 30; step += 1) {
        await separator.press(key);
      }
    } else {
      await separator.press(key);
    }
    await expectDrawerUnobstructed(drawer, evaluationCard);
  }
});
