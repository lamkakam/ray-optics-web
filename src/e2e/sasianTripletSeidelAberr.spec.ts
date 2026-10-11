/**
 * Playwright end-to-end test that loads the Sasian Triplet example system from `/example-systems`, confirms the overwrite modal, returns to the Lens Editor, and verifies all Seidel aberration modal tabs.
 *
 * @remarks
 * ## Flow
 *
 * - Navigate to `/example-systems`.
 * - Select `Sasian Triplet`.
 * - Click `Apply`, confirm `Load`, and wait for navigation back to `/`.
 * - Open the Prescription tab after the automatic computation has finished and the route has returned to `/`.
 * - Open the `3rd Order Seidel Aberrations` modal and compare table values in each tab, in tab order Seidel (surface by surface), Wavefront (surface by surface), Transverse and Field Curvature, against reference data. The Seidel table includes the primary chromatic `C-I`/`C-II` columns; the Wavefront table includes the Petzval Curvature and Primary Axial/Lateral Chromatic Aberr. columns.
 */
import { test, expect, type Locator } from "./fixtures";
import { dismissAnyOpenDialog } from "./utils";

function expectApprox(actual: number, expected: number, relTol = 5e-4): void {
  const tol = Math.abs(expected) * relTol + 1e-7;
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

const getCell = (modal: Locator, rowIndex: number, colIndex: number) =>
  modal.locator(
    `[role="tabpanel"] table tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`,
  );

test("Sasian Triplet Seidel aberration modal — all tabs", async ({
  pyodidePage: page,
}) => {
  await dismissAnyOpenDialog(page);

  // 1. Load the Sasian Triplet example from the dedicated route
  await page.goto("/example-systems");
  await page.getByRole("button", { name: "Sasian Triplet" }).click();
  await page.getByRole("button", { name: "Apply" }).click();

  // 2. Confirm overwrite dialog — "Load" also triggers Update System automatically
  const dialog = page.getByRole("dialog", { name: "Load Example System" });
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  await dialog.getByRole("button", { name: "Load" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5_000 });
  await page.waitForURL("**/");

  // 3. Navigate to Prescription tab after the example apply computation completes
  await page.getByRole("tab", { name: "Prescription" }).click();
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await expect(updateBtn).toBeEnabled({ timeout: 5_000 });

  // 4. Open Seidel modal
  await page
    .locator('button[aria-label="3rd Order Seidel Aberrations"]')
    .click();
  const modal = page.getByRole("dialog", {
    name: "3rd Order Seidel Aberrations",
  });
  await modal.waitFor({ state: "visible", timeout: 5_000 });

  // ── Tab 1: "Seidel (surface by surface)" (default, no click needed) ─────

  await expect(modal.locator('[role="tabpanel"] table tbody tr')).toHaveCount(
    7,
    { timeout: 5_000 },
  );

  await expect(
    modal.getByRole("columnheader", { name: "C-I", exact: true }),
  ).toBeVisible();
  await expect(
    modal.getByRole("columnheader", { name: "C-II", exact: true }),
  ).toBeVisible();

  // Reference data: S-I..S-V from rayoptics docs, then C-I and C-II from
  // compute_third_order_and_color (columns 1–7, col 0 is the surface label)
  const surfaceBySurface: number[][] = [
    [0.027654, 0.019379, 0.013581, 0.089174, 0.07201, 0.012304, 0.008623],
    [0.022082, -0.059501, 0.160327, -0.000288, -0.431229, 0.007738, -0.02085],
    [-0.105156, 0.137692, -0.180295, -0.085097, 0.347506, -0.021664, 0.028366],
    [
      -0.045358, -0.076796, -0.130024, -0.095046, -0.381069, -0.017384,
      -0.029432,
    ],
    [0.007942, 0.028382, 0.101431, 0.024373, 0.449596, 0.00558, 0.019941],
    [0.10381, -0.050068, 0.024148, 0.10318, -0.061411, 0.014496, -0.006992],
    [0.010973, -0.000912, -0.010832, 0.036297, -0.004597, 0.001071, -0.000344],
  ];

  for (let row = 0; row < surfaceBySurface.length; row++) {
    for (let col = 0; col < surfaceBySurface[row].length; col++) {
      const text = (await getCell(modal, row, col + 1).textContent()) ?? "";
      expectApprox(parseFloat(text), surfaceBySurface[row][col]);
    }
  }

  // ── Tab 2: "Wavefront (surface by surface)" ─────────────────────────────

  await modal
    .getByRole("tab", { name: "Wavefront (surface by surface)" })
    .click();
  await expect(
    modal.getByRole("columnheader", { name: "Petzval Curvature", exact: true }),
  ).toBeVisible({ timeout: 5_000 });

  // Per surface, then sum: W040, W131, W222, W220P (Petzval Curvature), W220,
  // W311, W020 (Primary Axial Chromatic Aberr.), W111 (Primary Lateral
  // Chromatic Aberr.), in waves (columns 1–8, col 0 is the surface label)
  const wavefront: number[][] = [
    [5.88312, 16.4914, 11.557, 37.9426, 43.7211, 61.2786, 10.4706, 14.6754],
    [
      4.69786, -50.634, 136.435, -0.122725, 68.0945, -366.965, 6.58473,
      -35.4854,
    ],
    [
      -22.3712, 117.172, -153.426, -36.2075, -112.921, 295.718, -18.4352,
      48.2783,
    ],
    [
      -9.64964, -65.3516, -110.647, -40.4408, -95.7645, -324.28, -14.7931,
      -50.0926,
    ],
    [1.68954, 24.1522, 86.3149, 10.3705, 53.5279, 382.595, 4.74831, 33.9389],
    [22.0848, -42.6064, 20.5492, 43.9018, 54.1764, -52.259, 12.3359, -11.8993],
    [
      2.33446, -0.776108, -9.21815, 15.4438, 10.8348, -3.91165, 0.911325,
      -0.584787,
    ],
  ];

  for (let row = 0; row < wavefront.length; row++) {
    for (let col = 0; col < wavefront[row].length; col++) {
      const text = (await getCell(modal, row, col + 1).textContent()) ?? "";
      expectApprox(parseFloat(text), wavefront[row][col]);
    }
  }

  // ── Tab 3: "Transverse" ──────────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Transverse" }).click();
  await expect(getCell(modal, 0, 0)).toContainText(
    "Transverse Spherical Aberration",
    { timeout: 5_000 },
  );

  const transverse = [
    -0.043893, 0.010944, -0.015198, -0.10186, -0.14519, 0.018387,
  ];

  for (let row = 0; row < transverse.length; row++) {
    const text = (await getCell(modal, row, 1).textContent()) ?? "";
    expectApprox(parseFloat(text), transverse[row]);
  }

  // ── Tab 4: "Field Curvature" ─────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Field Curvature" }).click();
  await expect(getCell(modal, 0, 0)).toContainText(
    "Tangential Field Curvature",
    { timeout: 5_000 },
  );

  const fieldCurvature = [
    { value: 0.000734, radius: 1362.4 },
    { value: 0.004921, radius: 203.21 },
    { value: 0.007014, radius: 142.57 },
  ];

  for (let row = 0; row < fieldCurvature.length; row++) {
    const valueText = (await getCell(modal, row, 1).textContent()) ?? "";
    expectApprox(parseFloat(valueText), fieldCurvature[row].value, 5e-4);

    const radiusText = (await getCell(modal, row, 2).textContent()) ?? "";
    expectApprox(parseFloat(radiusText), fieldCurvature[row].radius, 0.01);
  }
});
