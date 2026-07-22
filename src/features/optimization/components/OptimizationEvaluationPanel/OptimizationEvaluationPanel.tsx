/**
# `features/optimization/components/OptimizationEvaluationPanel/OptimizationEvaluationPanel.tsx`
*/
"use client";

import clsx from "clsx";
import { Paragraph } from "@/shared/components/primitives/Paragraph";
import { Table } from "@/shared/components/primitives/Table";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

/**
## Props

```ts
interface OptimizationEvaluationPanelProps {
  rows: ReadonlyArray<readonly [string, string, string, string]>;
  isEvaluating: boolean;
  invalidConfigMessage?: string;
  warningMessage?: string;
  maxBodyHeight?: number;
  allowBodyScroll?: boolean;
}
```
*/
interface OptimizationEvaluationPanelProps {
  readonly rows: ReadonlyArray<readonly [string, string, string, string]>;
  readonly isEvaluating: boolean;
  readonly invalidConfigMessage?: string;
  readonly warningMessage?: string;
  readonly maxBodyHeight?: number;
  readonly allowBodyScroll?: boolean;
}

/**
## Purpose

Displays the live operand evaluation section, including its empty state, loading status text, and residual table.

## Behavior

- Always renders a titled card with the optional "Updating evaluation…" status text.
- When `invalidConfigMessage` or `warningMessage` is provided, renders one shared non-blocking warning banner with the shared error text color directly above the table or empty-state text. `invalidConfigMessage` takes precedence.
- The evaluation table right-aligns the `Target`, `Weight`, and `Value` header/body columns while keeping `Operand Type` left-aligned.
- When `rows` is empty, renders the static empty-state message with the `Paragraph` `placeholder` variant instead of the table. This includes cases where the worker returned residuals but all of them were filtered out upstream because their effective displayed weight is zero.
- When `rows` is present and a warning banner is provided, the banner appears before the scroll/table body without changing the table layout.
- When `rows` is present and `allowBodyScroll` is `true`, the table body keeps `overflow-y-auto` and applies the caller-provided `maxBodyHeight` inline so parent layouts can grow or shrink the visible table area dynamically.
- When `allowBodyScroll` is `false`, the table body drops the internal vertical scrollbar and height cap so the entire table contributes to page height.
- Horizontal overflow remains enabled in both modes so wide tables still scroll sideways without clipping.
- The table accepts display rows whose target column is the literal string `N/A`, which is used for target-less residual entries such as Ray Fan variants.
*/
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
