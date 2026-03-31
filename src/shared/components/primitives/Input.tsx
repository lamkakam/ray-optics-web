import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "compact";
}

const BASE_CLASSES = [
  cx.input.style.borderRadius,
  cx.input.style.borderStyle,
  cx.input.style.outlineStyle,
  cx.input.style.transitionStyle,
  cx.input.size.defaultWidth,
  cx.input.size.focusRingWidth,
  cx.input.color.focusRingColor,
  cx.input.color.borderColor,
  cx.input.color.bgColor,
  cx.input.color.textColor,
] as const;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, variant = "default", ...rest }, ref) {
    const sizeClasses =
      variant === "compact"
        ? [
            cx.input.size.compactHorizontalPadding,
            cx.input.size.compactVerticalPadding,
            cx.input.size.compactFontSize,
            cx.input.size.compactWidth,
          ]
        : [
            cx.input.size.horizontalPadding,
            cx.input.size.verticalPadding,
            cx.input.size.fontSize,
          ];
    return (
      <input
        ref={ref}
        className={clsx(BASE_CLASSES, sizeClasses, className)}
        {...rest}
      />
    );
  },
);
