# `features/optimization/components/OptimizationWeightsGrid/OptimizationWeightsGrid.tsx`

Shared AG Grid wrapper for field and wavelength weight rows with a single numeric update callback.

- Wraps the grid in a fixed `200px`-high horizontal-overflow container and relies on parent layout padding instead of adding its own outer `p-4`.
- Uses AG Grid's normal layout so the grid owns vertical scrolling. Suppresses AG Grid touch gestures and applies the shared `ag-grid-touch-scroll` coarse-pointer styles for native two-axis panning and iOS momentum scrolling.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so Optimization field and wavelength columns keep a fixed order.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending weight edits commit when editing stops.
- Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while weight edits and their post-edit evaluation refreshes are pending.
- Provides AG Grid `getRowId` from each `WeightRow.id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active weight editor or discard uncommitted typed text.
- Sets fixed AG Grid column widths for `Index` (`80px`) and `Weight` (`90px`).
- Requires callers to provide `valueColumnWidth` so the shared `Value` column can use tab-specific initial widths.
