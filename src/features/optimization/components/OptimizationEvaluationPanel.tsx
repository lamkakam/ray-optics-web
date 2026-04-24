"use client";

import React from "react";
import clsx from "clsx";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Table } from "@/shared/components/primitives/Table";

interface OptimizationEvaluationPanelProps {
  readonly rows: ReadonlyArray<readonly [string, string, string, string]>;
  readonly isEvaluating: boolean;
  readonly maxBodyHeight?: number;
  readonly allowBodyScroll?: boolean;
}

export function OptimizationEvaluationPanel({
  rows,
  isEvaluating,
  maxBodyHeight,
  allowBodyScroll = true,
}: OptimizationEvaluationPanelProps) {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Operand Evaluation</h2>
        {isEvaluating ? (
          <span className="text-xs text-gray-500 dark:text-gray-400" role="status">
            Updating evaluation…
          </span>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div
          data-testid="optimization-evaluation-scroll"
          className={clsx(
            "overflow-x-auto px-4 py-3",
            allowBodyScroll ? "overflow-y-auto" : "overflow-y-visible",
          )}
          style={allowBodyScroll && maxBodyHeight !== undefined ? { maxHeight: `${maxBodyHeight}px` } : undefined}
        >
          <Table
            headers={["Operand Type", "Target", "Weight", "Value"]}
            rows={rows}
            columnAlignments={["left", "right", "right", "right"]}
          />
        </div>
      ) : (
        <Paragraph variant="placeholder" className="px-4 py-3">
          Evaluation results appear here when the current optimization config is valid.
        </Paragraph>
      )}
    </div>
  );
}
