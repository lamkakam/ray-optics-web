import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

/** Value and display label for one select option. */
export type SelectOption = {
  readonly value: string | number;
  readonly label: string;
};

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  /** Items to render as `<option>` elements */
  readonly options: ReadonlyArray<SelectOption>;
  /** Disabled first option shown when no value is selected */
  readonly placeholder?: string;
}

/**
 * Themed `<select>` primitive with two visual densities. Renders a list of `SelectOption` items and optionally a disabled placeholder. Forwards a ref for programmatic focus.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Implemented as `React.forwardRef` so it can be used inside AG Grid cell editors and third-party wrappers. The `ref` forwards to `<HTMLSelectElement>`, not the wrapper div.
 * - `disabled:opacity-50` and `disabled:cursor-not-allowed` are applied via style tokens.
 * - `appearance-none` is applied to both variants to strip native OS select rendering. This fixes iOS Safari's compact/pill-shaped appearance that ignores custom Tailwind styles.
 * - Both variants use responsive font-size tokens: 16 px (`text-base`) below 1440 px to avoid small-screen browser text zoom, and 14 px (`text-sm`) at `screenLG` for desktop density.
 * - The `<select>` is wrapped in a `<div>` with `relative w-full` plus any `className` passed via props. Width/spacing constraints (e.g. `max-w-xs`) are applied to the wrapper `<div>`, not the inner `<select>`. This ensures the SVG chevron arrow is always positioned relative to the visible control boundary and stays within bounds.
 * - The inner `<select>` always has `w-full` so it fills the wrapper regardless of the wrapper's width constraint.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ options, placeholder, className, ...rest }, ref) {
    const variantClasses = [
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
