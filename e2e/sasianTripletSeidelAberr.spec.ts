import { test, expect, type Page } from "@playwright/test";
import { PYODIDE_TIMEOUT, waitForPyodide, getColId } from "./utils";

const MODAL_SEL = '[role="dialog"][aria-labelledby="seidel-modal-title"]';

async function getCellText(
  page: Page,
  gridSel: string,
  rowIndex: number,
  colId: string
): Promise<string> {
  const cell = page.locator(
    `${gridSel} .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${colId}"]`
  );
  return (await cell.textContent()) ?? "";
}

function expectApprox(
  actual: number,
  expected: number,
  relTol = 5e-4
): void {
  const tol = Math.abs(expected) * relTol + 1e-7;
  expect(Math.abs(actual - expected)).toBeLessThan(tol);
}

test("Sasian Triplet Seidel aberration modal — all tabs", async ({ page }) => {
  test.setTimeout(PYODIDE_TIMEOUT + 60_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Load page and wait for Pyodide
  await page.goto("/");
  await waitForPyodide(page);

  // 2. Select "1: Sasian Triplet" example
  await page.locator('select[aria-label="Example system"]').selectOption("1: Sasian Triplet");

  // 3. Confirm overwrite dialog
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5_000 });
  await dialog.getByRole("button", { name: "Load" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5_000 });

  // 4. Click Update System and wait for completion
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await updateBtn.click();
  await expect(updateBtn).toBeDisabled({ timeout: 5_000 });
  await expect(updateBtn).toBeEnabled({ timeout: 60_000 });

  // 5. Open Seidel modal
  await page.locator('button[aria-label="3rd Order Seidel Aberrations"]').click();
  const modal = page.getByRole("dialog", { name: "3rd Order Seidel Aberrations" });
  await modal.waitFor({ state: "visible", timeout: 5_000 });

  // ── Tab 1: "Surface by Surface" (default, no click needed) ──────────────

  // Reference data from rayoptics docs
  const surfaceBySurface: Array<Record<string, number>> = [
    { "S-I": 0.027654, "S-II": 0.019379, "S-III": 0.013581, "S-IV": 0.089174, "S-V": 0.072010 },
    { "S-I": 0.022082, "S-II": -0.059501, "S-III": 0.160327, "S-IV": -0.000288, "S-V": -0.431229 },
    { "S-I": -0.105156, "S-II": 0.137692, "S-III": -0.180295, "S-IV": -0.085097, "S-V": 0.347506 },
    { "S-I": -0.045358, "S-II": -0.076796, "S-III": -0.130024, "S-IV": -0.095046, "S-V": -0.381069 },
    { "S-I": 0.007942, "S-II": 0.028382, "S-III": 0.101431, "S-IV": 0.024373, "S-V": 0.449596 },
    { "S-I": 0.103810, "S-II": -0.050068, "S-III": 0.024148, "S-IV": 0.103180, "S-V": -0.061411 },
    { "S-I": 0.010973, "S-II": -0.000912, "S-III": -0.010832, "S-IV": 0.036297, "S-V": -0.004597 },
  ];

  for (let row = 0; row < surfaceBySurface.length; row++) {
    for (const col of ["S-I", "S-II", "S-III", "S-IV", "S-V"] as const) {
      const text = await getCellText(page, MODAL_SEL, row, col);
      expectApprox(parseFloat(text), surfaceBySurface[row][col]);
    }
  }

  // ── Tab 2: "Transverse" ──────────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Transverse" }).click();
  // Wait for grid to mount with Transverse data (row 0 = TSA)
  await expect(
    page.locator(`${MODAL_SEL} .ag-row[row-index="0"] .ag-cell[col-id="_key"]`)
  ).toContainText("Transverse Spherical Aberration", { timeout: 5_000 });

  const transverse = [
    -0.043893,
    0.010944,
    -0.015198,
    -0.101860,
    -0.145190,
    0.018387,
  ];

  for (let row = 0; row < transverse.length; row++) {
    const text = await getCellText(page, MODAL_SEL, row, "_value");
    expectApprox(parseFloat(text), transverse[row]);
  }

  // ── Tab 3: "Wavefront" ───────────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Wavefront" }).click();
  // Wait for grid to re-mount with Wavefront data (row 0 changes from TSA → W040 "Spherical Aberration")
  await expect(
    page.locator(`${MODAL_SEL} .ag-row[row-index="0"] .ag-cell[col-id="_key"]`)
  ).toContainText("Spherical Aberration", { timeout: 5_000 });
  await expect(
    page.locator(`${MODAL_SEL} .ag-row[row-index="0"] .ag-cell[col-id="_key"]`)
  ).not.toContainText("Transverse", { timeout: 5_000 });

  const wavefront = [
    2.334457,
    -0.776108,
    -9.218154,
    10.834770,
    -3.911650,
  ];

  for (let row = 0; row < wavefront.length; row++) {
    const text = await getCellText(page, MODAL_SEL, row, "_value");
    expectApprox(parseFloat(text), wavefront[row]);
  }

  // ── Tab 4: "Field Curvature" ─────────────────────────────────────────────

  await modal.getByRole("tab", { name: "Field Curvature" }).click();
  // Wait for grid to re-mount with Field Curvature data (row 0 = TCV)
  await expect(
    page.locator(`${MODAL_SEL} .ag-row[row-index="0"] .ag-cell[col-id="_key"]`)
  ).toContainText("Tangential Field Curvature", { timeout: 5_000 });

  const fieldCurvature = [0.000734, 0.004921, 0.007014];

  // "Value" and "Curvature Radius" both use field "_value"; use first matching col-id
  const valueColId = await getColId(page, MODAL_SEL, "Value");

  for (let row = 0; row < fieldCurvature.length; row++) {
    const cell = page
      .locator(
        `${MODAL_SEL} .ag-row[row-index="${row}"] .ag-cell[col-id="${valueColId}"]`
      )
      .first();
    const text = (await cell.textContent()) ?? "";
    expectApprox(parseFloat(text), fieldCurvature[row], 0.01);
  }
});
