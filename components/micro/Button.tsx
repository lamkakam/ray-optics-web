import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating";
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

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant: ButtonVariant;
  readonly size?: ButtonSize;
};

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
    : SIZE_CLASSES[size ?? "md"];

  return (
    <button
      type={type}
      className={clsx(
        VARIANT_CLASSES[variant],
        s.cursor,
        s.opacity,
        sizeClass,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
