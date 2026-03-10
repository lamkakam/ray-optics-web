import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating" | "icon";
export type ButtonSize = "md" | "xs";

const { color: c, size: sz, style: s } = cx.button;

const VARIANT_CLASSES = {
  primary: [c.primaryBgColor, c.primaryHoverBgColor, c.primaryTextColor, s.borderRadius, s.fontWeight, "transition"],
  secondary: ["border", c.secondaryBorderColor, c.secondaryBgColor, c.secondaryTextColor, c.secondaryHoverBgColor, s.borderRadius, s.fontWeight, "transition"],
  toggle: ["border", c.toggleBorderColor, c.toggleBgColor, c.toggleTextColor, c.toggleHoverBgColor, s.borderRadius, s.fontWeight, "transition"],
  danger: [c.dangerBgColor, c.dangerHoverBgColor, c.dangerTextColor, s.borderRadius, s.fontWeight, "transition"],
  floating: ["absolute", "border", s.borderRadius, c.floatingBorderColor, c.floatingBgColor, c.floatingTextColor, c.floatingHoverBgColor, s.floatingHorizontalMargin, s.floatingVerticalMargin],
  icon: ["inline-flex", "items-center", "justify-center", c.iconBgColor, c.iconHoverBgColor, c.iconTextColor, s.iconBorderRadius, s.iconFontWeight, s.iconHorizontalMargin, s.iconVerticalMargin],
} as const satisfies Record<ButtonVariant, readonly string[]>;

const SIZE_CLASSES = {
  md: sz.md,
  xs: sz.xs,
} as const satisfies Record<ButtonSize, string>;

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant: "icon";
  readonly size?: never;
};

type RegularButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant: Exclude<ButtonVariant, "icon">;
  readonly size?: ButtonSize;
};

type ButtonProps = IconButtonProps | RegularButtonProps;

export function Button({
  variant,
  size,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const sizeClass = variant === "icon" || variant === "floating"
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
