# `e2e/utils.ts`

Shared Playwright helpers for ray-optics-web end-to-end tests.

## General Helpers

- `waitForPyodide(page)` waits for the initialization banner to disappear, opens the Prescription tab, and confirms `Update System` is enabled.
- `reloadAndWait(page)` reloads the page and delegates to `waitForPyodide`.
- `dismissAnyOpenDialog(page)` closes a visible dialog using `Cancel`, `Close`, or `OK` when available.
- `getColId(page, gridSel, headerText)` resolves an AG Grid column id from a visible column header.

## AG Grid Editing Helpers

- `editNumberCell`, `selectGridOption`, `insertRowAfter`, and `setMedium` address rows by AG Grid `row-index`; medium helpers select the manufacturer and fill the searchable Glass datalist before confirming.
- `editFieldRow`, `selectFraunhofer`, and `editWeightCell` are modal-grid helpers and also address rows by AG Grid `row-index`.

## Prescription Grid Helpers

- `getPrescriptionSurfaceRow(page, gridSel, surfaceIndex)` locates a prescription surface row by the visible `Index` column value.
- `waitForPrescriptionSurfaceCount(page, gridSel, expectedCount)` waits until the prescription grid renders exactly the expected number of surface-index cells.
- `insertPrescriptionSurfaceAtEnd(page, gridSel, expectedSurfaceCount)` clicks the last available prescription Insert row button and waits for the visible surface count.
- `editPrescriptionNumberCell` and `selectPrescriptionGridOption` edit prescription rows by visible surface index and resolve the target cell by the current visible column header text.
- `setPrescriptionMedium` edits prescription rows by visible surface index and fills the searchable Glass datalist.

Use the prescription-specific helpers for the main lens prescription grid. AG Grid physical `row-index` and generated `col-id` values are implementation details and can diverge from user-facing surface indices or change after grid re-renders.
