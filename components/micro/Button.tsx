import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ButtonVariant = "primary" | "secondary" | "toggle" | "danger" | "floating";
export type ButtonSize = "md" | "xs" | "icon";

const VARIANT_COLORS = {
  primary:   cx.button.color.primary,
  secondary: cx.button.color.secondary,
  toggle:    cx.button.color.toggle,
  danger:    cx.button.color.danger,
  floating:  cx.button.color.floating,
} as const satisfies Record<ButtonVariant, string>;

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

  return (
    <button
      type={type}
      className={clsx(
        isFloating
          ? cx.button.style.floating
          : isIcon
            ? cx.button.style.iconBase
            : cx.button.style.base,
        !isIcon && (variant === "secondary" || variant === "toggle") && "border",
        VARIANT_COLORS[variant],
        isFloating ? cx.button.size.xs : SIZE_CLASSES[size],
        cx.button.style.disabled,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
