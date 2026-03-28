import { expect, type Page } from "@playwright/test";

export const PYODIDE_TIMEOUT = 120_000;

export async function waitForPyodide(page: Page): Promise<void> {
  await page
    .getByText("Initializing Ray Optics")
    .waitFor({ state: "visible", timeout: 10_000 });
  await page
    .getByText("Initializing Ray Optics")
    .waitFor({ state: "hidden", timeout: PYODIDE_TIMEOUT });
  // Update System button lives in the Prescription tab
  await page.getByRole("tab", { name: "Prescription" }).click();
  const updateBtn = page.locator('button[aria-label="Update System"]');
  await expect(updateBtn).toBeEnabled({ timeout: 5_000 });
}

export async function dismissAnyOpenDialog(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  const isVisible = await dialog.isVisible().catch(() => false);
  if (!isVisible) return;
  for (const label of ["Cancel", "Close", "OK"]) {
    const btn = dialog.getByRole("button", { name: label });
    const btnVisible = await btn.isVisible().catch(() => false);
    if (btnVisible) {
      await btn.click();
      await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
      return;
    }
  }
}

export async function reloadAndWait(page: Page): Promise<void> {
  await page.reload();
  await waitForPyodide(page);
}

// Helper: discover col-id from AG-Grid header text
export async function getColId(
  page: Page,
  gridSel: string,
  headerText: string
): Promise<string> {
  const header = page
    .locator(`${gridSel} [role="columnheader"]:has-text("${headerText}")`)
    .first();
  const colId = await header.getAttribute("col-id");
  if (!colId) throw new Error(`col-id not found for "${headerText}"`);
  return colId;
}

// Helper: double-click cell to enter edit mode, fill, Enter to commit
export async function editNumberCell(
  page: Page,
  gridSel: string,
  rowIndex: number,
  colId: string,
  value: string
): Promise<void> {
  const cellSel = `${gridSel} .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${colId}"]`;
  const cell = page.locator(cellSel);
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator("input").first();
  await input.waitFor({ state: "visible", timeout: 3_000 });
  await input.fill(value);
  await input.press("Enter");
  await page.waitForTimeout(100);
}

// Helper: agSelectCellEditor — click cell, Enter, click popup option
export async function selectGridOption(
  page: Page,
  gridSel: string,
  rowIndex: number,
  colId: string,
  option: string
): Promise<void> {
  const cell = page.locator(
    `${gridSel} .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${colId}"]`
  );
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await page.keyboard.press("Enter");
  const opt = page
    .locator(`.ag-popup .ag-list-item:has-text("${option}")`)
    .first();
  await opt.waitFor({ state: "visible", timeout: 3_000 });
  await opt.click();
  await page.waitForTimeout(100);
}

// Helper: insert row after given row-index, wait for new row
export async function insertRowAfter(
  page: Page,
  gridSel: string,
  rowIndex: number
): Promise<void> {
  const row = page.locator(`${gridSel} .ag-row[row-index="${rowIndex}"]`);
  await row.getByRole("button", { name: "Insert row" }).click();
  await page
    .locator(`${gridSel} .ag-row[row-index="${rowIndex + 1}"]`)
    .waitFor({ state: "attached", timeout: 3_000 });
}

// Helper: open MediumSelectorModal, pick manufacturer+glass, Confirm
export async function setMedium(
  page: Page,
  gridSel: string,
  rowIndex: number,
  manufacturer: string,
  glass: string
): Promise<void> {
  const row = page.locator(`${gridSel} .ag-row[row-index="${rowIndex}"]`);
  await row.hover();
  await row.getByRole("button", { name: "Edit medium" }).click();
  const modal = page.getByRole("dialog", { name: "Select Medium" });
  await modal.waitFor({ state: "visible", timeout: 3_000 });
  await page.getByLabel("Manufacturer").selectOption(manufacturer);
  await page.getByLabel("Glass").selectOption(glass);
  await page.getByRole("button", { name: "Confirm" }).click();
  await modal.waitFor({ state: "hidden", timeout: 5_000 });
}

// Helper: edit a number cell in FieldConfigModal's grid (col-id="value")
export async function editFieldRow(
  page: Page,
  modalGrid: string,
  rowIndex: number,
  value: string
): Promise<void> {
  const cell = page.locator(
    `${modalGrid} .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="value"]`
  );
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator("input").first();
  await input.waitFor({ state: "visible", timeout: 3_000 });
  await input.fill(value);
  await input.press("Enter");
  await page.waitForTimeout(100);
}

// Helper: select Fraunhofer symbol in WavelengthConfigModal (col-id="fraunhofer", agSelectCellEditor)
export async function selectFraunhofer(
  page: Page,
  modalGrid: string,
  rowIndex: number,
  symbol: string
): Promise<void> {
  const cell = page.locator(
    `${modalGrid} .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="fraunhofer"]`
  );
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
  await page.keyboard.press("Enter");
  const opt = page
    .locator(`.ag-popup .ag-list-item:has-text("${symbol}")`)
    .first();
  await opt.waitFor({ state: "visible", timeout: 3_000 });
  await opt.click();
  await page.waitForTimeout(100);
}

// Helper: edit weight cell (col-id="weight") in WavelengthConfigModal
export async function editWeightCell(
  page: Page,
  modalGrid: string,
  rowIndex: number,
  value: string
): Promise<void> {
  const cell = page.locator(
    `${modalGrid} .ag-row[row-index="${rowIndex}"] .ag-cell[col-id="weight"]`
  );
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator("input").first();
  await input.waitFor({ state: "visible", timeout: 3_000 });
  await input.fill(value);
  await input.press("Enter");
  await page.waitForTimeout(100);
}
