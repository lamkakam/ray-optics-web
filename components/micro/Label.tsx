import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const BASE_CLASSES = [
  cx.label.style.baseDisplay,
  cx.label.style.baseFontWeight,
  cx.label.size.baseMargin,
  cx.label.color.textColor,
  cx.label.size.default,
] as const;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, ...rest }, ref) {
    return (
      <label
        ref={ref}
        className={clsx(BASE_CLASSES, className)}
        {...rest}
      />
    );
  },
);
