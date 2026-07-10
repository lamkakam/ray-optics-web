# `features/optimization/components/OptimizationWeightsGrid/OptimizationWeightsGrid.tsx`

Shared AG Grid wrapper for field and wavelength weight rows with a single numeric update callback.

- Wraps the grid in a horizontal-overflow container and relies on parent layout padding instead of adding its own outer `p-4`.
- Matches the Lens Prescription grid's responsive height: `h-[calc(100vh-160px)]` below `1440px`, then `h-full min-h-[200px]` at `1440px` and above.
- Uses AG Grid's normal layout so the grid owns vertical scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so Optimization field and wavelength columns keep a fixed order.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending weight edits commit when editing stops.
- Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while weight edits and their post-edit evaluation refreshes are pending.
- Provides AG Grid `getRowId` from each `WeightRow.id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active weight editor or discard uncommitted typed text.
- Sets fixed AG Grid column widths for `Index` (`80px`) and `Weight` (`90px`).
- Requires callers to provide `valueColumnWidth` so the shared `Value` column can use tab-specific initial widths.
