"use client";

import { Button, type ButtonSize } from "@/shared/components/primitives/Button";

interface OptimizationActionBarProps {
  readonly canOptimize: boolean;
  readonly canApplyToEditor: boolean;
  readonly isOptimizing: boolean;
  readonly buttonSize: ButtonSize;
  readonly onOptimize: () => void;
  readonly onApplyToEditor: () => void;
}

export function OptimizationActionBar({
  canOptimize,
  canApplyToEditor,
  isOptimizing,
  buttonSize,
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
        size={buttonSize}
      >
        Optimize
      </Button>
      <Button
        variant="primary"
        aria-label="Apply to Editor"
        onClick={onApplyToEditor}
        disabled={!canApplyToEditor}
        size={buttonSize}
      >
        Apply to Editor
      </Button>
    </div>
  );
}
