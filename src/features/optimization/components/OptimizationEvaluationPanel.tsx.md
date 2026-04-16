# `features/optimization/components/OptimizationEvaluationPanel.tsx`

## Purpose

Displays the live operand evaluation section, including its empty state, loading status text, and residual table.

## Props

```ts
interface OptimizationEvaluationPanelProps {
  rows: ReadonlyArray<readonly [string, string, string, string]>;
  isEvaluating: boolean;
  maxBodyHeight?: number;
  allowBodyScroll?: boolean;
}
```

## Behavior

- Always renders a titled card with the optional "Updating evaluation…" status text.
- When `rows` is empty, renders the static empty-state message instead of the table.
- When `rows` is present and `allowBodyScroll` is `true`, the table body keeps `overflow-y-auto` and applies the caller-provided `maxBodyHeight` inline so parent layouts can grow or shrink the visible table area dynamically.
- When `allowBodyScroll` is `false`, the table body drops the internal vertical scrollbar and height cap so the entire table contributes to page height.
- Horizontal overflow remains enabled in both modes so wide tables still scroll sideways without clipping.
