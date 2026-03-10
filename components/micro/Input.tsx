import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

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
  cx.input.size.horizontalPadding,
  cx.input.size.verticalPadding,
  cx.input.size.fontSize,
] as const;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(BASE_CLASSES, className)}
        {...rest}
      />
    );
  },
);
