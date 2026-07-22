import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }

const BASE_CLASSES = [
  cx.label.style.fontWeight,
  cx.label.size.margin,
  cx.label.color.textColor,
  cx.label.size.fontSize,
] as const;

/**
 * Themed `<label>` primitive. Renders as a `block` element with consistent font weight, size, and bottom margin from style tokens.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Implemented as `React.forwardRef`.
 * - Always renders as a block element (`display: block`), making it stack above its associated input.
 */
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
