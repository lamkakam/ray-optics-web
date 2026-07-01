# `features/optimization/components/OptimizationWeightsGrid/OptimizationWeightsGrid.tsx`

Shared AG Grid wrapper for field and wavelength weight rows with a single numeric update callback.

- Wraps the grid in a horizontal-overflow container and relies on parent layout padding instead of adding its own outer `p-4`.
- Keeps AG Grid in `domLayout="autoHeight"` without adding its own vertical scroll container so parent layout containers can own vertical scrolling.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so Optimization field and wavelength columns keep a fixed order.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending weight edits are committed before outside optimization actions consume the current weights.
- Provides AG Grid `getRowId` from each `WeightRow.id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active weight editor or discard uncommitted typed text.
- Sets fixed AG Grid column widths for `Index` (`80px`) and `Weight` (`90px`).
- Requires callers to provide `valueColumnWidth` so the shared `Value` column can use tab-specific initial widths.
