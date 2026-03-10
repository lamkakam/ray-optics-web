import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/components/ui/modalTokens";

export type SelectOption = {
  readonly value: string | number;
  readonly label: string;
};

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  readonly options: ReadonlyArray<SelectOption>;
  readonly compact?: boolean;
  readonly placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, compact, placeholder, className, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(
          compact
            ? [
                cx.select.style.compactBorderStyle,
                cx.select.style.compactBorderRadius,
                cx.select.style.compactOutlineStyle,
                cx.select.size.compactHorizontalPadding,
                cx.select.size.compactVerticalPadding,
                cx.select.size.compactFontSize,
              ]
            : [
                cx.select.style.borderRadius,
                cx.select.style.borderStyle,
                cx.select.style.outlineStyle,
                cx.select.size.defaultWidth,
                cx.select.size.horizontalPadding,
                cx.select.size.verticalPadding,
                cx.select.size.fontSize,
              ],
          cx.select.style.transitionStyle,
          cx.select.size.focusRingWidth,
          cx.select.color.focusRingColor,
          cx.select.color.borderColor,
          cx.select.color.bgColor,
          cx.select.color.textColor,
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);
