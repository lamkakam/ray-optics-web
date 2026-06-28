# `e2e/utils.ts`

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
