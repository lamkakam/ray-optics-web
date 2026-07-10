# `features/optimization/components/OptimizationOperandsTab/OptimizationOperandsTab.tsx`

Renders the editable operands tab with AG Grid column definitions, add/delete actions, and operand update callbacks.

- Uses a height-constrained flex column with a `1rem` gap and the same responsive total height as Lens Prescription: `h-[calc(100vh-160px)]` below `1440px`, then `h-full min-h-[200px]` at `1440px` and above.
- Keeps the content-sized Add Operand button above the grid. The grid wrapper uses `min-h-0 flex-1`, so it occupies the concrete remaining height after the button and gap, while the tab retains horizontal overflow and relies on parent layout padding instead of adding its own outer `p-4`.
- Uses AG Grid's normal layout so the grid owns vertical scrolling. AG Grid touch handling remains enabled for touchscreen column resizing while the shared `ag-grid-touch-scroll` coarse-pointer styles preserve native two-axis panning and iOS momentum scrolling on viewport areas.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so users cannot reorder operand-table columns.
- Sets fixed AG Grid column widths of `215`, `85`, `90`, and `90` for Operand Kind, Target, Weight, and the delete/action column.
- Uses `EditableAgGridReact`, which defaults AG Grid `stopEditingWhenCellsLoseFocus` to `true`, so pending operand edits commit when editing stops.
- Accepts optional AG Grid cell edit lifecycle callbacks and forwards them to `EditableAgGridReact` so the page can disable Optimize while operand edits and their post-edit evaluation refreshes are pending.
- Provides AG Grid `getRowId` from each operand `id` so live Operand Evaluation rerenders and replacement row objects do not interrupt the active operand editor or discard uncommitted typed text.
- Builds the operand-kind selector from shared operand metadata instead of hardcoding the list locally.
- Imports operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
- Shows `N/A` and disables editing in the `Target` column for target-less operands such as combined and axis-specific Ray Fan operands.
