import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type SwitchSize = "sm" | "md";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** Controlled checked state */
  readonly checked: boolean;
  /** Called with the next checked state on click */
  readonly onCheckedChange: (checked: boolean) => void;
  /** Accessible name for the switch button */
  readonly ariaLabel: string;
  /** Content shown only while checked */
  readonly checkedContent?: React.ReactNode;
  /** Content shown only while unchecked */
  readonly uncheckedContent?: React.ReactNode;
  /** Visual size. Defaults to `"md"` */
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

const CONTENT_OFFSET_CLASSES = {
  sm: {
    checked: sz.contentOffsetCheckedSm,
    unchecked: sz.contentOffsetUncheckedSm,
  },
  md: {
    checked: sz.contentOffsetCheckedMd,
    unchecked: sz.contentOffsetUncheckedMd,
  },
} as const satisfies Record<SwitchSize, Record<"checked" | "unchecked", string>>;

/**
 * Controlled switch primitive for binary settings. It renders a native button with `role="switch"` and tokenized track, thumb, disabled, and animation classes.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Renders `<button type="button" role="switch">` by default.
 * - Sets `aria-checked` from the controlled `checked` prop.
 * - Calls `onCheckedChange(!checked)` on click unless the consumer prevents the click event.
 * - Relies on native button `disabled` behavior, so disabled switches do not fire click handlers.
 * - Uses fixed tokenized dimensions for `sm` and `md`, so content changes do not resize the control.
 * - Positions visible state content on the side opposite the thumb to prevent labels such as `Auto` and `Manual` from being covered by the thumb.
 * - The inherited `className` prop is merged via `twMerge` after token classes.
 * - Applies tokenized track color, thumb translation, transition, `will-change-transform`, opacity, and disabled cursor classes.
 */
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
          "pointer-events-none absolute bottom-0 top-0 flex items-center justify-center font-medium leading-none",
          CONTENT_SIZE_CLASSES[size],
          checked ? CONTENT_OFFSET_CLASSES[size].checked : CONTENT_OFFSET_CLASSES[size].unchecked,
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
