# `features/optimization/components/OptimizationEvaluationPanel/OptimizationEvaluationPanel.tsx`

## Purpose

Displays the live operand evaluation section, including its empty state, loading status text, and residual table.

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

## Behavior

- Always renders a titled card with the optional "Updating evaluation…" status text.
- When `invalidConfigMessage` or `warningMessage` is provided, renders one shared non-blocking warning banner with the shared error text color directly above the table or empty-state text. `invalidConfigMessage` takes precedence.
- The evaluation table right-aligns the `Target`, `Weight`, and `Value` header/body columns while keeping `Operand Type` left-aligned.
- When `rows` is empty, renders the static empty-state message with the `Paragraph` `placeholder` variant instead of the table. This includes cases where the worker returned residuals but all of them were filtered out upstream because their effective displayed weight is zero.
- When `rows` is present and a warning banner is provided, the banner appears before the scroll/table body without changing the table layout.
- When `rows` is present and `allowBodyScroll` is `true`, the table body keeps `overflow-y-auto` and applies the caller-provided `maxBodyHeight` inline so parent layouts can grow or shrink the visible table area dynamically.
- When `allowBodyScroll` is `false`, the table body drops the internal vertical scrollbar and height cap so the entire table contributes to page height.
- Horizontal overflow remains enabled in both modes so wide tables still scroll sideways without clipping.
- The table accepts display rows whose target column is the literal string `N/A`, which is used for target-less residual entries such as `ray_fan`.
