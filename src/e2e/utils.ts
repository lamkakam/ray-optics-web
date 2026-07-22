/**
Shared Playwright helpers for ray-optics-web end-to-end tests.

## General Helpers

- `waitForPyodide(page)` waits for the initialization banner to disappear, opens the Prescription tab, and confirms `Update System` is enabled.
- `reloadAndWait(page)` reloads the page and delegates to `waitForPyodide`.
- `dismissAnyOpenDialog(page)` closes a visible dialog using `Cancel`, `Close`, or `OK` when available.
- `getColId(page, gridSel, headerText)` resolves an AG Grid column id from a visible column header.

## AG Grid Editing Helpers

- `editNumberCell`, `selectGridOption`, `insertRowAfter`, and `setMedium` address rows by AG Grid `row-index`; medium helpers select the Catalog field and fill the searchable Glass datalist before confirming.
- `editFieldRow`, `selectFraunhofer`, and `editWeightCell` are modal-grid helpers and also address rows by AG Grid `row-index`.

## Prescription Grid Helpers

- `getPrescriptionSurfaceRow(page, gridSel, surfaceIndex)` locates a prescription surface row by the visible numeric `Index` column value.
- `getPrescriptionSpecialRow(page, gridSel, rowLabel)` locates non-surface prescription rows such as `Object` and `Image` by their center-row Surface label.
- Prescription surface-row lookup intentionally finds the pinned-left `Index` row first, reads its physical `row-index`, then returns the matching center-row container for non-index cells. Object/Image cell lookup uses their blank pinned endpoint rows for the same bridge. This avoids strict-mode conflicts from AG Grid's pinned and center row duplicates.
- `waitForPrescriptionSurfaceCount(page, gridSel, expectedCount)` waits until the prescription grid renders exactly the expected number of surface-index cells.
- `insertPrescriptionSurfaceAtEnd(page, gridSel, expectedSurfaceCount)` clicks the last available prescription Insert row button and waits for the visible surface count.
- `getPrescriptionCell`, `getPrescriptionSpecialCell`, `getPrescriptionActionButton`, and `getPrescriptionSpecialActionButton` expose center-row cells or cell buttons by header text after the pinned-index bridge has resolved the row.
- `editPrescriptionNumberCell` and `selectPrescriptionGridOption` edit prescription rows by visible surface index and resolve the target cell by the current `col-id` for the visible column header text.
- `setPrescriptionMedium` edits prescription rows by visible surface index and fills the searchable Glass datalist.

Use the prescription-specific helpers for the main lens prescription grid. AG Grid physical `row-index` and generated `col-id` values are implementation details and can diverge from user-facing surface indices or change after grid re-renders.
*/
import { expect, type Locator, type Page } from "@playwright/test";

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

function exactCellText(value: number): RegExp {
  return new RegExp(`^\\s*${value}\\s*$`);
}

export async function getPrescriptionSurfaceRow(
  page: Page,
  gridSel: string,
  surfaceIndex: number
): Promise<Locator> {
  return getPrescriptionRowByIndexText(page, gridSel, exactCellText(surfaceIndex));
}

export async function getPrescriptionSpecialRow(
  page: Page,
  gridSel: string,
  rowLabel: "Object" | "Image"
): Promise<Locator> {
  const surfaceColId = await getColId(page, gridSel, "Surface");
  const row = page.locator(`${gridSel} .ag-center-cols-container .ag-row`, {
    has: page.locator(`.ag-cell[col-id="${surfaceColId}"]`, {
      hasText: new RegExp(`^\\s*${rowLabel}\\s*$`),
    }),
  });
  await expect(row).toHaveCount(1, { timeout: 3_000 });
  return row.first();
}

export async function getPrescriptionSpecialRowByEndpoint(
  page: Page,
  gridSel: string,
  rowLabel: "Object" | "Image"
): Promise<Locator> {
  const indexColId = await getColId(page, gridSel, "Index");
  const indexRows = page.locator(
    `${gridSel} .ag-pinned-left-cols-container .ag-row`,
    {
      has: page.locator(`.ag-cell[col-id="${indexColId}"]`, {
        hasText: /^\s*$/,
      }),
    }
  );
  const indexRow = rowLabel === "Object" ? indexRows.first() : indexRows.last();
  await expect(indexRow).toBeAttached({ timeout: 3_000 });

  const rowIndex = await indexRow.getAttribute("row-index");
  if (!rowIndex) throw new Error(`row-index not found for ${rowLabel}`);

  const centerRow = page.locator(
    `${gridSel} .ag-center-cols-container .ag-row[row-index="${rowIndex}"]`
  );
  await expect(centerRow).toHaveCount(1, { timeout: 3_000 });
  return centerRow.first();
}

async function getPrescriptionRowByIndexText(
  page: Page,
  gridSel: string,
  indexText: RegExp
): Promise<Locator> {
  const indexColId = await getColId(page, gridSel, "Index");
  const indexRow = page.locator(`${gridSel} .ag-pinned-left-cols-container .ag-row`, {
    has: page.locator(`.ag-cell[col-id="${indexColId}"]`, {
      hasText: indexText,
    }),
  });
  await expect(indexRow).toHaveCount(1, { timeout: 3_000 });

  const rowIndex = await indexRow.first().getAttribute("row-index");
  if (!rowIndex) throw new Error(`row-index not found for ${indexText}`);

  const centerRow = page.locator(
    `${gridSel} .ag-center-cols-container .ag-row[row-index="${rowIndex}"]`
  );
  await expect(centerRow).toHaveCount(1, { timeout: 3_000 });
  return centerRow.first();
}

export async function waitForPrescriptionSurfaceCount(
  page: Page,
  gridSel: string,
  expectedCount: number
): Promise<void> {
  const indexColId = await getColId(page, gridSel, "Index");
  const surfaceIndexCells = page
    .locator(
      `${gridSel} .ag-pinned-left-cols-container .ag-cell[col-id="${indexColId}"]`
    )
    .filter({ hasText: /^\s*\d+\s*$/ });
  await expect(surfaceIndexCells).toHaveCount(expectedCount, {
    timeout: 3_000,
  });
}

export async function getGridCellByHeaderText(
  page: Page,
  gridSel: string,
  row: Locator,
  headerText: string
): Promise<Locator> {
  const colId = await getColId(page, gridSel, headerText);
  return row.locator(`.ag-cell[col-id="${colId}"]`);
}

export async function getPrescriptionCell(
  page: Page,
  gridSel: string,
  surfaceIndex: number,
  headerText: string
): Promise<Locator> {
  const row = await getPrescriptionSurfaceRow(page, gridSel, surfaceIndex);
  const cell = await getGridCellByHeaderText(page, gridSel, row, headerText);
  await expect(cell).toBeAttached({ timeout: 3_000 });
  return cell;
}

export async function getPrescriptionSpecialCell(
  page: Page,
  gridSel: string,
  rowLabel: "Object" | "Image",
  headerText: string
): Promise<Locator> {
  const row =
    headerText === "Surface"
      ? await getPrescriptionSpecialRow(page, gridSel, rowLabel)
      : await getPrescriptionSpecialRowByEndpoint(page, gridSel, rowLabel);
  const cell = await getGridCellByHeaderText(page, gridSel, row, headerText);
  await expect(cell).toBeAttached({ timeout: 3_000 });
  return cell;
}

export async function getPrescriptionActionButton(
  page: Page,
  gridSel: string,
  surfaceIndex: number,
  headerText: string,
  buttonName: string
): Promise<Locator> {
  const cell = await getPrescriptionCell(page, gridSel, surfaceIndex, headerText);
  return cell.getByRole("button", { name: buttonName });
}

export async function getPrescriptionSpecialActionButton(
  page: Page,
  gridSel: string,
  rowLabel: "Object" | "Image",
  headerText: string,
  buttonName: string
): Promise<Locator> {
  const cell = await getPrescriptionSpecialCell(page, gridSel, rowLabel, headerText);
  return cell.getByRole("button", { name: buttonName });
}

export async function insertPrescriptionSurfaceAtEnd(
  page: Page,
  gridSel: string,
  expectedSurfaceCount: number
): Promise<void> {
  const insertButtons = page
    .locator(`${gridSel} .ag-row`)
    .getByRole("button", { name: "Insert row" });
  await insertButtons.last().click();
  await waitForPrescriptionSurfaceCount(page, gridSel, expectedSurfaceCount);
}

export async function editPrescriptionNumberCell(
  page: Page,
  gridSel: string,
  surfaceIndex: number,
  headerText: string,
  value: string
): Promise<void> {
  const cell = await getPrescriptionCell(page, gridSel, surfaceIndex, headerText);
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  const input = cell.locator("input").first();
  await input.waitFor({ state: "visible", timeout: 3_000 });
  await input.fill(value);
  await input.press("Enter");
  await page.waitForTimeout(100);
}

export async function selectPrescriptionGridOption(
  page: Page,
  gridSel: string,
  surfaceIndex: number,
  headerText: string,
  option: string
): Promise<void> {
  const cell = await getPrescriptionCell(page, gridSel, surfaceIndex, headerText);
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

export async function setPrescriptionMedium(
  page: Page,
  gridSel: string,
  surfaceIndex: number,
  manufacturer: string,
  glass: string
): Promise<void> {
  const row = await getPrescriptionSurfaceRow(page, gridSel, surfaceIndex);
  await row.hover();
  await row.getByRole("button", { name: "Edit medium" }).click();
  const modal = page.getByRole("dialog", { name: "Select Medium" });
  await modal.waitFor({ state: "visible", timeout: 3_000 });
  await modal.getByLabel("Catalog").selectOption(manufacturer);
  await modal.getByLabel("Glass", { exact: true }).fill(glass);
  await modal.getByRole("button", { name: "Confirm" }).click();
  await modal.waitFor({ state: "hidden", timeout: 5_000 });
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
  await modal.getByLabel("Catalog").selectOption(manufacturer);
  await modal.getByLabel("Glass", { exact: true }).fill(glass);
  await modal.getByRole("button", { name: "Confirm" }).click();
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
