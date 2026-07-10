# `features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab.tsx`

Renders the editable operands tab with AG Grid column definitions, add/delete actions, and operand update callbacks.

- Keeps the add button above and outside the fixed-height grid container, inside a horizontal-overflow wrapper, and relies on parent layout padding instead of adding its own outer `p-4`.
- Uses a `200px`-high container and AG Grid's normal layout so the grid owns vertical scrolling. Suppresses AG Grid touch gestures and applies the shared `ag-grid-touch-scroll` coarse-pointer styles for native two-axis panning and iOS momentum scrolling.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so users cannot reorder operand-table columns.
- Sets fixed AG Grid column widths of `215`, `85`, `90`, and `90` for Operand Kind, Target, Weight, and the delete/action column.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending operand edits commit when editing stops.
- Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while operand edits and their post-edit evaluation refreshes are pending.
- Provides AG Grid `getRowId` from each operand `id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active operand editor or discard uncommitted typed text.
- Builds the operand-kind selector from shared operand metadata instead of hardcoding the list locally.
- Imports operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
- Shows `N/A` and disables editing in the `Target` column for target-less operands such as combined and axis-specific Ray Fan operands.
