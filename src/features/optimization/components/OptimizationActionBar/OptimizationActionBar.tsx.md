# `features/optimization/components/OptimizationActionBar/OptimizationActionBar.tsx`

Renders the optimization page primary actions and delegates button state/click handling to page-level callbacks.

## Props

- `canOptimize`: enables `Optimize` when the page has a valid optimization config with non-zero effective contribution.
- `canApplyToEditor`: enables `Apply to Editor` when there is an optimization model to apply.
- `isOptimizing`: disables `Optimize` while an optimization run is active.
- `onOptimize`: called by `Optimize`.
- `onApplyToEditor`: called by `Apply to Editor`.
