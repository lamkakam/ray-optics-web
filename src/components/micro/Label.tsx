import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/styleTokens";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

const BASE_CLASSES = [
  cx.label.style.fontWeight,
  cx.label.size.margin,
  cx.label.color.textColor,
  cx.label.size.fontSize,
] as const;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, ...rest }, ref) {
    return (
      <label
        ref={ref}
        className={clsx("block", BASE_CLASSES, className)}
        {...rest}
      />
    );
  },
);
