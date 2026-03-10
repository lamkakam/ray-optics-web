import React from "react";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "toggle"
  | "danger"
  | "floating"
  | "iconAdd"
  | "iconDelete";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant: ButtonVariant;
}

function buildClassName(variant: ButtonVariant, extra?: string): string {
  const disabled = cx.button.style.disabled;

  let base: string;
  switch (variant) {
    case "primary":
      base = `${cx.button.style.base} ${cx.button.color.primary} ${cx.button.size.md}`;
      break;
    case "secondary":
      base = `border ${cx.button.style.base} ${cx.button.color.secondary} ${cx.button.size.md}`;
      break;
    case "toggle":
      base = `border ${cx.button.style.base} ${cx.button.color.toggle} ${cx.button.size.md}`;
      break;
    case "danger":
      base = `${cx.button.style.base} ${cx.button.color.danger} ${cx.button.size.md}`;
      break;
    case "floating":
      base = `${cx.button.style.floating} ${cx.button.color.floating} ${cx.button.size.xs}`;
      break;
    case "iconAdd":
      base = `${cx.button.style.iconBase} ${cx.button.color.iconAdd} ${cx.button.size.icon}`;
      break;
    case "iconDelete":
      base = `${cx.button.style.iconBase} ${cx.button.color.iconDelete} ${cx.button.size.icon}`;
      break;
  }

  return [base, disabled, extra].filter(Boolean).join(" ");
}

export function Button({
  variant,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buildClassName(variant, className)} {...rest}>
      {children}
    </button>
  );
}
