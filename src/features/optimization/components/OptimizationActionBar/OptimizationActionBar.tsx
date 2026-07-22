/**
# `features/optimization/components/OptimizationActionBar/OptimizationActionBar.tsx`
*/
"use client";

import { Button } from "@/shared/components/primitives/Button";

/**
## Props

- `canOptimize`: enables `Optimize` when the page has a valid optimization config with non-zero effective contribution.
- `canApplyToEditor`: enables `Apply to Editor` when there is an optimization model to apply.
- `isOptimizing`: disables `Optimize` while an optimization run is active.
- `onOptimize`: called by `Optimize`.
- `onApplyToEditor`: called by `Apply to Editor`.
*/
interface OptimizationActionBarProps {
  readonly canOptimize: boolean;
  readonly canApplyToEditor: boolean;
  readonly isOptimizing: boolean;
  readonly onOptimize: () => void;
  readonly onApplyToEditor: () => void;
}

/**
Renders the optimization page primary actions and delegates button state/click handling to page-level callbacks.
*/
export function OptimizationActionBar({
  canOptimize,
  canApplyToEditor,
  isOptimizing,
  onOptimize,
  onApplyToEditor,
}: OptimizationActionBarProps) {
  return (
    <div className="mb-4 flex gap-3">
      <Button
        variant="primary"
        aria-label="Optimize"
        onClick={onOptimize}
        disabled={!canOptimize || isOptimizing}
      >
        Optimize
      </Button>
      <Button
        variant="primary"
        aria-label="Apply to Editor"
        onClick={onApplyToEditor}
        disabled={!canApplyToEditor}
      >
        Apply to Editor
      </Button>
    </div>
  );
}
