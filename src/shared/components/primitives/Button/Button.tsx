import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

/** Supported visual button variants. */
export type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating";
/** Supported button density sizes. */
export type ButtonSize = "md" | "sm" | "xs";

const { color: c, size: sz, style: s } = cx.button;

const VARIANT_CLASSES = {
  primary: [c.primaryBgColor, c.primaryHoverBgColor, c.primaryTextColor, s.borderRadius, s.fontWeight, "transition"],
  secondary: ["border", c.secondaryBorderColor, c.secondaryBgColor, c.secondaryTextColor, c.secondaryHoverBgColor, s.borderRadius, s.fontWeight, "transition"],
  toggle: ["border", c.toggleBorderColor, c.toggleBgColor, c.toggleTextColor, c.toggleHoverBgColor, s.borderRadius, s.fontWeight, "transition"],
  danger: [c.dangerBgColor, c.dangerHoverBgColor, c.dangerTextColor, s.borderRadius, s.fontWeight, "transition"],
  floating: ["absolute", "border", s.borderRadius, c.floatingBorderColor, c.floatingBgColor, c.floatingTextColor, c.floatingHoverBgColor, sz.floatingHorizontalMargin, sz.floatingVerticalMargin],
} as const satisfies Record<ButtonVariant, readonly string[]>;

const SIZE_CLASSES = {
  md: [sz.horizontalPaddingMd, sz.verticalPaddingMd, sz.fontSizeMd],
  sm: [sz.horizontalPaddingSm, sz.verticalPaddingSm, sz.fontSizeSm],
  xs: [sz.horizontalPaddingXs, sz.verticalPaddingXs, sz.fontSizeXs],
} as const satisfies Record<ButtonSize, readonly string[]>;

type FloatingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual style. `floating` is absolutely positioned with a translucent background */
  readonly variant: "floating";
  /** Padding and font-size tier. Defaults to `"md"`. Forbidden on `floating` variant (auto-uses `xs`) */
  readonly size?: never;
};

type RegularButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Visual style. `floating` is absolutely positioned with a translucent background */
  readonly variant: ButtonVariant;
  /** Padding and font-size tier. Defaults to `"md"`. Forbidden on `floating` variant (auto-uses `xs`) */
  readonly size?: ButtonSize;
};

type ButtonProps = FloatingButtonProps | RegularButtonProps;

/**
 * Themed button primitive that maps a `variant` and optional `size` to Tailwind classes via `styleTokens`. Covers the full range of button styles used across the app.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - `floating` variant renders as `position: absolute` with `top-2 right-2` positioning, intended for overlay buttons inside a relative container.
 * - The inherited `type` prop defaults to `"button"`, preventing accidental form submission.
 * - The inherited `className` prop is merged via `twMerge` after variant and size classes so consumers can safely override individual tokens.
 * - `disabled:opacity-50` and `disabled:cursor-not-allowed` are always applied.
 */
export function Button({
  variant,
  size,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const sizeClass = variant === "floating"
    ? SIZE_CLASSES.xs
    : SIZE_CLASSES[size ?? "sm"];

  return (
    <button
      type={type}
      className={twMerge(clsx(
        VARIANT_CLASSES[variant],
        s.cursor,
        s.opacity,
        sizeClass,
        className,
      ))}
      {...rest}
    >
      {children}
    </button>
  );
}
