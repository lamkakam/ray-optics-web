import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating";
export type ButtonSize = "md" | "xs" | "icon";

function variantColorClasses(variant: ButtonVariant): string[] {
  const c = cx.button.color;
  switch (variant) {
    case "primary":   return [c.primaryBgColor,   c.primaryTextColor];
    case "secondary": return [c.secondaryBorderColor, c.secondaryBgColor, c.secondaryTextColor, c.secondaryHoverBgColor];
    case "toggle":    return [c.toggleBorderColor,  c.toggleBgColor, c.toggleTextColor, c.toggleHoverBgColor];
    case "danger":    return [c.dangerBgColor,    c.dangerTextColor];
    case "floating":  return [c.floatingBorderColor, c.floatingBgColor, c.floatingTextColor, c.floatingHoverBgColor];
  }
}

const SIZE_CLASSES = {
  md:   cx.button.size.md,
  xs:   cx.button.size.xs,
  icon: cx.button.size.icon,
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
  const isFloating = variant === "floating";
  const isIcon = size === "icon";
  const s = cx.button.style;

  return (
    <button
      type={type}
      className={clsx(
        isFloating
          ? ["absolute", s.floatingHorizontalMargin, s.floatingVerticalMargin, s.floating]
          : isIcon
            ? ["inline-flex items-center justify-center", s.iconBorderRadius, s.iconFontWeight, s.iconHorizontalMargin, s.iconVerticalMargin]
            : [s.borderRadius, s.fontWeight, "transition"],
        s.cursor,
        s.opacity,
        variantColorClasses(variant),
        !isIcon && (variant === "secondary" || variant === "toggle") && "border",
        isFloating ? cx.button.size.xs : SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
