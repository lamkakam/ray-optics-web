# `features/optimization/components/OptimizationLensPrescriptionGrid.tsx`

Renders the optimization lens prescription grid, including radius/thickness variable buttons and read-only inspection cells that open existing lens-editor dialogs.

- Uses a horizontal-overflow wrapper for the wide prescription table and relies on parent layout padding instead of adding its own outer `p-4`.
- Leaves vertical overflow to the parent drawer/page layout by keeping the AG Grid in `domLayout="autoHeight"` and not introducing an inner vertical scroller.
