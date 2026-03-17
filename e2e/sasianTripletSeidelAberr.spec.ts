import { test, expect, type Locator } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

function expectApprox(
  actual: number,
  expected: number,
  relTol = 5e-4
): void {
  const tol = Math.abs(expected) * relTol + 1e-7;
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

const getCell = (modal: Locator, rowIndex: number, colIndex: number) =>
  modal.locator(
    `[role="tabpanel"] table tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`
  );

test("Sasian Triplet Seidel aberration modal — all tabs", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  // 1. Select "1: Sasian Triplet" example
  await page.locator('select[aria-label="Example system"]').selectOption("1: Sasian Triplet");

  // 2. Confirm overwrite dialog
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  await dialog.getByRole("button", { name: "Load" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5_000 });

  // 3. Click Update System and wait for completion
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await updateBtn.click();
  await expect(updateBtn).toBeDisabled({ timeout: 5_000 });
  await expect(updateBtn).toBeEnabled({ timeout: 60_000 });

  // 4. Open Seidel modal
  await page.locator('button[aria-label="3rd Order Seidel Aberrations"]').click();
  const modal = page.getByRole("dialog", { name: "3rd Order Seidel Aberrations" });
  await modal.waitFor({ state: "visible", timeout: 5_000 });

  // ── Tab 1: "Surface by Surface" (default, no click needed) ──────────────

  await expect(modal.locator('[role="tabpanel"] table tbody tr')).toHaveCount(7, { timeout: 5_000 });

  // Reference data from rayoptics docs (columns 1–5, col 0 is the surface label)
  const surfaceBySurface: Array<[number, number, number, number, number]> = [
    [0.027654, 0.019379, 0.013581, 0.089174, 0.072010],
    [0.022082, -0.059501, 0.160327, -0.000288, -0.431229],
    [-0.105156, 0.137692, -0.180295, -0.085097, 0.347506],
    [-0.045358, -0.076796, -0.130024, -0.095046, -0.381069],
    [0.007942, 0.028382, 0.101431, 0.024373, 0.449596],
    [0.103810, -0.050068, 0.024148, 0.103180, -0.061411],
    [0.010973, -0.000912, -0.010832, 0.036297, -0.004597],
  ];

  for (let row = 0; row < surfaceBySurface.length; row++) {
    for (let col = 0; col < 5; col++) {
      const text = await getCell(modal, row, col + 1).textContent() ?? "";
      expectApprox(parseFloat(text), surfaceBySurface[row][col]);
    }
  }

  // ── Tab 2: "Transverse" ──────────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Transverse" }).click();
  await expect(getCell(modal, 0, 0)).toContainText("Transverse Spherical Aberration", { timeout: 5_000 });

  const transverse = [
    -0.043893,
    0.010944,
    -0.015198,
    -0.101860,
    -0.145190,
    0.018387,
  ];

  for (let row = 0; row < transverse.length; row++) {
    const text = await getCell(modal, row, 1).textContent() ?? "";
    expectApprox(parseFloat(text), transverse[row]);
  }

  // ── Tab 3: "Wavefront" ───────────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Wavefront" }).click();
  await expect(getCell(modal, 0, 0)).toContainText("Spherical Aberration", { timeout: 5_000 });

  const wavefront = [
    2.334457,
    -0.776108,
    -9.218154,
    10.834770,
    -3.911650,
  ];

  for (let row = 0; row < wavefront.length; row++) {
    const text = await getCell(modal, row, 1).textContent() ?? "";
    expectApprox(parseFloat(text), wavefront[row]);
  }

  // ── Tab 4: "Field Curvature" ─────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Field Curvature" }).click();
  await expect(getCell(modal, 0, 0)).toContainText("Tangential Field Curvature", { timeout: 5_000 });

  const fieldCurvature = [
    { value: 0.000734, radius: 1362.40 },
    { value: 0.004921, radius: 203.21 },
    { value: 0.007014, radius: 142.57 },
  ];

  for (let row = 0; row < fieldCurvature.length; row++) {
    const valueText = await getCell(modal, row, 1).textContent() ?? "";
    expectApprox(parseFloat(valueText), fieldCurvature[row].value, 5e-4);

    const radiusText = await getCell(modal, row, 2).textContent() ?? "";
    expectApprox(parseFloat(radiusText), fieldCurvature[row].radius, 0.01);
  }
});
