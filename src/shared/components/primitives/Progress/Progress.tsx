/**
# `shared/components/primitives/Progress/Progress.tsx`
*/
import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type ProgressVariant = "linear";
export type ProgressSize = "sm" | "md";

export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Current determinate progress value */
  readonly value: number;
  /** Lower bound. Defaults to `0` */
  readonly min?: number;
  /** Upper bound. Defaults to `100` */
  readonly max?: number;
  /** Visual variant. Defaults to `"linear"` */
  readonly variant?: ProgressVariant;
  /** Track and status text size. Defaults to `"md"` */
  readonly size?: ProgressSize;
  /** Shows the rounded percentage status when true. Defaults to `true` */
  readonly showStatus?: boolean;
  /** Accessible label. Defaults to `"Progress"` */
  readonly ariaLabel?: string;
}

const { color: c, size: sz, style: s } = cx.progress;

const TRACK_SIZE_CLASSES = {
  sm: sz.trackHeightSm,
  md: sz.trackHeightMd,
} as const satisfies Record<ProgressSize, string>;

const STATUS_SIZE_CLASSES = {
  sm: sz.statusFontSizeSm,
  md: sz.statusFontSizeMd,
} as const satisfies Record<ProgressSize, string>;

const TRACK_VARIANT_CLASSES = {
  linear: [
    "overflow-hidden",
    c.trackBgColor,
    s.trackBorderRadius,
  ],
} as const satisfies Record<ProgressVariant, readonly string[]>;

function clampPercent(value: number, min: number, max: number): number {
  const range = max - min;

  if (range <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((value - min) / range) * 100));
}

/**
## Purpose

Determinate progress primitive. It currently supports a linear progress bar and keeps the API variant-based so a circular progress variant can be added without replacing consumers.

## Key Behaviors

- Renders a semantic root with `role="progressbar"`.
- Sets `aria-label`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` from props and defaults.
- Normalizes `value` within `min` and `max`, rounds the computed percentage, and clamps rendered status and indicator width to `0%` through `100%`.
- Hides the visible percentage when `showStatus={false}`.
- The inherited `className` prop is merged via `twMerge` after token classes.
- Uses `componentTokens.progress` for track color, indicator color, status text color, dimensions, radius, transition, and `will-change` classes.

## Usages

```tsx
<Progress value={completedItems} min={0} max={totalItems} ariaLabel="Import progress" />
```
*/
export function Progress({
  value,
  min = 0,
  max = 100,
  variant = "linear",
  size = "md",
  showStatus = true,
  ariaLabel = "Progress",
  className,
  ...rest
}: ProgressProps) {
  const percent = Math.round(clampPercent(value, min, max));

  return (
    <div
      {...rest}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={twMerge(clsx(
        "flex flex-col",
        sz.width,
        sz.gap,
        className,
      ))}
    >
      <div
        data-testid="progress-track"
        className={twMerge(clsx(
          TRACK_VARIANT_CLASSES[variant],
          TRACK_SIZE_CLASSES[size],
        ))}
      >
        <div
          data-testid="progress-indicator"
          aria-hidden="true"
          className={twMerge(clsx(
            "h-full",
            c.indicatorBgColor,
            s.indicatorBorderRadius,
            s.indicatorTransition,
            s.transitionDuration,
            s.transitionEase,
            s.indicatorWillChange,
          ))}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showStatus ? (
        <span
          className={twMerge(clsx(
            "leading-none",
            c.statusTextColor,
            STATUS_SIZE_CLASSES[size],
          ))}
        >
          {percent}%
        </span>
      ) : undefined}
    </div>
  );
}
