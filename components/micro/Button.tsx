import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating";
export type ButtonSize = "md" | "xs" | "icon";

const { color: c, size: sz, style: s } = cx.button;

const VARIANT_COLORS = {
  primary:   [c.primaryBgColor, c.primaryHoverBgColor, c.primaryTextColor],
  secondary: [c.secondaryBorderColor, c.secondaryBgColor, c.secondaryTextColor, c.secondaryHoverBgColor],
  toggle:    [c.toggleBorderColor, c.toggleBgColor, c.toggleTextColor, c.toggleHoverBgColor],
  danger:    [c.dangerBgColor, c.dangerHoverBgColor, c.dangerTextColor],
  floating:  [c.floatingBorderColor, c.floatingBgColor, c.floatingTextColor, c.floatingHoverBgColor],
} as const satisfies Record<ButtonVariant, string[]>;

const VARIANT_STRUCTURE = {
  primary:   [s.borderRadius, s.fontWeight, "transition"],
  secondary: ["border", s.borderRadius, s.fontWeight, "transition"],
  toggle:    ["border", s.borderRadius, s.fontWeight, "transition"],
  danger:    [s.borderRadius, s.fontWeight, "transition"],
  floating:  ["absolute", s.floating, s.floatingHorizontalMargin, s.floatingVerticalMargin],
} as const satisfies Record<ButtonVariant, string[]>;

const ICON_STRUCTURE = [
  "inline-flex", "items-center", "justify-center",
  s.iconBorderRadius, s.iconFontWeight, s.iconHorizontalMargin, s.iconVerticalMargin,
] as const;

const SIZE_CLASSES = {
  md:   sz.md,
  xs:   sz.xs,
  icon: sz.icon,
} as const satisfies Record<ButtonSize, string>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant: ButtonVariant;
  readonly size?: ButtonSize;
}

export function Button({
  variant,
  size = "md",
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const isIcon = size === "icon";
  const isFloating = variant === "floating";

  return (
    <button
      type={type}
      className={clsx(
        isIcon ? ICON_STRUCTURE : VARIANT_STRUCTURE[variant],
        s.cursor,
        s.opacity,
        VARIANT_COLORS[variant],
        isFloating ? sz.xs : SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
