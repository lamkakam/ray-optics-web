import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

export type SelectOption = {
  readonly value: string | number;
  readonly label: string;
};

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  readonly options: ReadonlyArray<SelectOption>;
  readonly type?: "default" | "compact";
  readonly placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, type = "default", placeholder, className, ...rest }, ref) {
    const variantClasses =
      type === "compact"
        ? [
          cx.select.style.compactBorderStyle,
          cx.select.style.compactBorderRadius,
          cx.select.style.compactOutlineStyle,
          cx.select.size.compactWidth,
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
        ];

    const selectClassName = clsx(
      variantClasses,
      cx.select.style.transitionStyle,
      cx.select.size.focusRingWidth,
      cx.select.color.focusRingColor,
      cx.select.color.borderColor,
      cx.select.color.bgColor,
      cx.select.color.textColor,
      cx.select.style.opacity,
      cx.select.style.cursor,
      cx.select.style.appearanceReset,
      cx.select.size.customArrowPadding,
    );

    return (
      <div className={clsx("relative w-full", className)}>
        <select
          ref={ref}
          className={selectClassName}
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
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
);
