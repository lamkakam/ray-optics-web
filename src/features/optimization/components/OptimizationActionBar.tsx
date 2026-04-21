"use client";

import React from "react";
import { Button } from "@/shared/components/primitives/Button";

interface OptimizationActionBarProps {
  readonly canOptimize: boolean;
  readonly canApplyToEditor: boolean;
  readonly isOptimizing: boolean;
  readonly onOptimize: () => void;
  readonly onApplyToEditor: () => void;
}

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
