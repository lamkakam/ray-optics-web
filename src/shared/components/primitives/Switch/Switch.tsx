import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type SwitchSize = "sm" | "md";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly ariaLabel: string;
  readonly checkedContent?: React.ReactNode;
  readonly uncheckedContent?: React.ReactNode;
  readonly size?: SwitchSize;
}

const { color: c, size: sz, style: s } = cx.switch;

const TRACK_SIZE_CLASSES = {
  sm: [sz.trackWidthSm, sz.trackHeightSm],
  md: [sz.trackWidthMd, sz.trackHeightMd],
} as const satisfies Record<SwitchSize, readonly string[]>;

const THUMB_SIZE_CLASSES = {
  sm: [sz.thumbWidthSm, sz.thumbHeightSm],
  md: [sz.thumbWidthMd, sz.thumbHeightMd],
} as const satisfies Record<SwitchSize, readonly string[]>;

const THUMB_CHECKED_TRANSLATE_CLASSES = {
  sm: sz.thumbTranslateCheckedSm,
  md: sz.thumbTranslateCheckedMd,
} as const satisfies Record<SwitchSize, string>;

const CONTENT_SIZE_CLASSES = {
  sm: sz.contentFontSizeSm,
  md: sz.contentFontSizeMd,
} as const satisfies Record<SwitchSize, string>;

export function Switch({
  checked,
  onCheckedChange,
  ariaLabel,
  checkedContent,
  uncheckedContent,
  size = "md",
  type = "button",
  className,
  onClick,
  ...rest
}: SwitchProps) {
  const visibleContent = checked ? checkedContent : uncheckedContent;

  return (
    <button
      {...rest}
      type={type}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          onCheckedChange(!checked);
        }
      }}
      className={twMerge(clsx(
        "relative inline-flex shrink-0 items-center border-0",
        TRACK_SIZE_CLASSES[size],
        sz.trackPadding,
        checked ? c.checkedTrackColor : c.uncheckedTrackColor,
        s.trackBorderRadius,
        s.trackTransition,
        s.transitionDuration,
        s.transitionEase,
        s.focusOutline,
        s.focusRingWidth,
        c.focusRingColor,
        s.enabledCursor,
        s.cursor,
        s.opacity,
        className,
      ))}
    >
      <span
        data-testid="switch-content"
        aria-hidden="true"
        className={twMerge(clsx(
          "pointer-events-none absolute inset-0 flex items-center justify-center font-medium leading-none",
          CONTENT_SIZE_CLASSES[size],
          checked ? c.checkedContentColor : c.uncheckedContentColor,
          s.contentTransition,
          s.transitionDuration,
          s.transitionEase,
        ))}
      >
        {visibleContent}
      </span>
      <span
        data-testid="switch-thumb"
        aria-hidden="true"
        className={twMerge(clsx(
          "pointer-events-none relative z-10 block",
          THUMB_SIZE_CLASSES[size],
          checked ? THUMB_CHECKED_TRANSLATE_CLASSES[size] : sz.thumbTranslateUnchecked,
          c.thumbColor,
          c.thumbShadowColor,
          s.thumbBorderRadius,
          s.thumbTransition,
          s.transitionDuration,
          s.transitionEase,
          s.thumbWillChange,
        ))}
      />
    </button>
  );
}
