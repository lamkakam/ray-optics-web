# `shared/components/primitives/Progress/Progress.tsx`

## Purpose

Determinate progress primitive. It currently supports a linear progress bar and keeps the API variant-based so a circular progress variant can be added without replacing consumers.

## Props

```ts
export type ProgressVariant = "linear";
export type ProgressSize = "sm" | "md";

export interface ProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly variant?: ProgressVariant;
  readonly size?: ProgressSize;
  readonly showStatus?: boolean;
  readonly ariaLabel?: string;
}
```

## Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `number` | Yes | Current determinate progress value |
| `min` | `number` | No | Lower bound. Defaults to `0` |
| `max` | `number` | No | Upper bound. Defaults to `100` |
| `variant` | `"linear"` | No | Visual variant. Defaults to `"linear"` |
| `size` | `"sm" \| "md"` | No | Track and status text size. Defaults to `"md"` |
| `showStatus` | `boolean` | No | Shows the rounded percentage status when true. Defaults to `true` |
| `ariaLabel` | `string` | No | Accessible label. Defaults to `"Progress"` |
| `className` | `string` | No | Merged via `twMerge` after token classes |

## Key Behaviors

- Renders a semantic root with `role="progressbar"`.
- Sets `aria-label`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` from props and defaults.
- Normalizes `value` within `min` and `max`, rounds the computed percentage, and clamps rendered status and indicator width to `0%` through `100%`.
- Hides the visible percentage when `showStatus={false}`.
- Uses `componentTokens.progress` for track color, indicator color, status text color, dimensions, radius, transition, and `will-change` classes.

## Usages

```tsx
<Progress value={completedItems} min={0} max={totalItems} ariaLabel="Import progress" />
```
