"use client";

import clsx from "clsx";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Table } from "@/shared/components/primitives/Table";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface OptimizationEvaluationPanelProps {
  readonly rows: ReadonlyArray<readonly [string, string, string, string]>;
  readonly isEvaluating: boolean;
  readonly invalidConfigMessage?: string;
  readonly warningMessage?: string;
  readonly maxBodyHeight?: number;
  readonly allowBodyScroll?: boolean;
}

export function OptimizationEvaluationPanel({
  rows,
  isEvaluating,
  invalidConfigMessage,
  warningMessage,
  maxBodyHeight,
  allowBodyScroll = true,
}: OptimizationEvaluationPanelProps) {
  const activeWarningMessage = invalidConfigMessage ?? warningMessage;
  const warningBanner = activeWarningMessage === undefined ? null : (
    <Paragraph variant="placeholder" className={clsx(cx.text.color.errorTextColor, "px-4 pt-3")}>
      {activeWarningMessage}
    </Paragraph>
  );

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
      {warningBanner}
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
        <Paragraph variant="placeholder" className={activeWarningMessage === undefined ? "px-4 py-3" : "px-4 pb-3 pt-1"}>
          Evaluation results appear here when the current optimization config is valid.
        </Paragraph>
      )}
    </div>
  );
}
