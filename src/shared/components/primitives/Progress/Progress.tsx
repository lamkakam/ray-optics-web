import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type ProgressVariant = "linear";
export type ProgressSize = "sm" | "md";

export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly variant?: ProgressVariant;
  readonly size?: ProgressSize;
  readonly showStatus?: boolean;
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
