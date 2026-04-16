# `features/optimization/components/OptimizationLensPrescriptionGrid.tsx`

Renders the optimization lens prescription grid, including radius/thickness variable buttons and read-only inspection cells that open existing lens-editor dialogs.

- Uses a padded wrapper with horizontal overflow support for the wide prescription table.
- Leaves vertical overflow to the parent drawer/page layout by keeping the AG Grid in `domLayout="autoHeight"` and not introducing an inner vertical scroller.
