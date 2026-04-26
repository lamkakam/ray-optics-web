# `features/optimization/components/OptimizationOperandsTab.tsx`

Renders the editable operands tab with AG Grid column definitions, add/delete actions, and operand update callbacks.

- Keeps the add button above the grid inside a horizontal-overflow wrapper and relies on parent layout padding instead of adding its own outer `p-4`.
- Uses AG Grid `domLayout="autoHeight"` and does not add a vertical overflow wrapper so the surrounding drawer/page layout remains the only vertical scroller.
- Applies `defaultColDef={{ sortable: false, suppressMovable: true }}` so users cannot reorder operand-table columns.
- Builds the operand-kind selector from shared operand metadata instead of hardcoding the list locally.
- Imports operand kind types from `features/optimization/types/optimizationWorkerTypes.ts`.
- Shows `N/A` and disables editing in the `Target` column for target-less operands such as `ray_fan`.
