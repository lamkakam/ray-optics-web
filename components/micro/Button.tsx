import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
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

type FloatingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant: "floating";
  readonly size?: never;
};

type RegularButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant: ButtonVariant;
  readonly size?: ButtonSize;
};

type ButtonProps = FloatingButtonProps | RegularButtonProps;

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
      className={twMerge(clsx(
        VARIANT_CLASSES[variant],
        s.cursor,
        s.opacity,
        sizeClass,
        "flex items-center justify-center",
        className,
      ))}
      {...rest}
    >
      {children}
    </button>
  );
}
