# `features/optimization/components/OptimizationActionBar/OptimizationActionBar.tsx`

Renders the optimization page primary actions and delegates button state/click handling to page-level callbacks.

## Props

- `canOptimize`: enables `Optimize` when the page has a valid optimization config with non-zero effective contribution.
- `canApplyToEditor`: enables `Apply to Editor` when there is an optimization model to apply.
- `isOptimizing`: disables `Optimize` while an optimization run is active.
- `buttonSize`: shared `ButtonSize` applied to both action buttons. `OptimizationPage` passes `xs` on `screenSM` and `sm` otherwise so these actions match Lens Editor's `Update System` responsive sizing.
- `onOptimize`: called by `Optimize`.
- `onApplyToEditor`: called by `Apply to Editor`.
