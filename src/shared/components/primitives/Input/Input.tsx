import React from "react";
import clsx from "clsx";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const BASE_CLASSES = [
  cx.input.style.borderRadius,
  cx.input.style.borderStyle,
  cx.input.style.outlineStyle,
  cx.input.style.transitionStyle,
  cx.input.style.opacity,
  cx.input.style.cursor,
  cx.input.size.defaultWidth,
  cx.input.size.focusRingWidth,
  cx.input.color.focusRingColor,
  cx.input.color.borderColor,
  cx.input.color.bgColor,
  cx.input.color.textColor,
] as const;

/**
 * Themed `<input>` primitive with two visual densities. Forwards a ref and passes all standard HTML input attributes through.
 *
 * @remarks
 * ## Key Behaviors
 *
 * - Implemented as `React.forwardRef` so it can be used inside forms and AG Grid cell editors.
 * - Defaults `autoComplete` to `"off"` to suppress browser autofill on shared form inputs, while still honoring any explicit `autoComplete` prop passed by the caller.
 * - Base classes (border, background, text color, focus ring, and disabled-state opacity/cursor tokens) are always applied; only padding and font size differ between variants.
 * - Both variants use responsive font-size tokens: 16 px (`text-base`) below 1440 px to avoid small-screen browser text zoom, and 14 px (`text-sm`) at `screenLG` for desktop density.
 * - Disabled styling is tokenized via `cx.input.style.opacity` and `cx.input.style.cursor`, which mirror the shared disabled behavior used by `Select`.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { autoComplete = "off", className, ...rest },
    ref,
  ) {
    const sizeClasses = [
      cx.input.size.horizontalPadding,
      cx.input.size.verticalPadding,
      cx.input.size.fontSize,
    ];
    return (
      <input
        ref={ref}
        className={clsx(BASE_CLASSES, sizeClasses, className)}
        autoComplete={autoComplete}
        {...rest}
      />
    );
  },
);
