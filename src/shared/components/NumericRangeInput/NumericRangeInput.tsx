"use client";

import clsx from "clsx";
import { Input } from "@/shared/components/primitives/Input";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

interface NumericRangeInputProps {
  /** Lower-bound text; blank or `undefined` means no lower bound. */
  readonly min: string | undefined;
  /** Upper-bound text; blank or `undefined` means no upper bound. */
  readonly max: string | undefined;
  /** Receives the raw lower-bound text on every change. */
  readonly onMinChange: (value: string) => void;
  /** Receives the raw upper-bound text on every change. */
  readonly onMaxChange: (value: string) => void;
  readonly minAriaLabel: string;
  readonly maxAriaLabel: string;
  /** When `true`, a non-blank bound must be a number greater than zero. */
  readonly positive?: boolean;
}

/** Returns whether non-blank bound text is not a number, or not positive when `positive`. */
function isInvalidBound(value: string | undefined, positive: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return false;
  }
  const parsed = Number(value.trim());
  return !Number.isFinite(parsed) || (positive && parsed <= 0);
}

/**
 * Controlled pair of numeric text inputs for an inclusive `[min, max]` range, where either bound may be left blank to
 * leave that side unbounded.
 *
 * @remarks
 * - Renders two shared `Input` primitives side by side (lower bound first) with `Min` / `Max` placeholders and the
 *   caller's aria labels.
 * - Uses `type="text"` with `inputMode="decimal"` rather than `type="number"`, so partially typed or invalid text is
 *   preserved and reported verbatim instead of collapsing to an empty value that would silently drop a bound.
 * - Holds no local state: every keystroke calls `onMinChange` / `onMaxChange` with the raw text, and the displayed
 *   values always come from `min` / `max` (`undefined` displays as empty).
 * - Sets `aria-invalid` (and the shared invalid border) on a bound whose non-blank text is not a finite number, or, when
 *   `positive` is set, is zero or negative. Blank bounds are always valid; whether at least one bound is required is
 *   left to the caller's validation.
 */
export function NumericRangeInput({
  min,
  max,
  onMinChange,
  onMaxChange,
  minAriaLabel,
  maxAriaLabel,
  positive = false,
}: NumericRangeInputProps) {
  const inputClassName = clsx(
    "min-w-0 flex-1",
    cx.input.color.invalidBorderColor,
  );
  return (
    <div className="flex w-full items-center gap-1">
      <Input
        type="text"
        inputMode="decimal"
        placeholder="Min"
        aria-label={minAriaLabel}
        aria-invalid={isInvalidBound(min, positive)}
        className={inputClassName}
        value={min ?? ""}
        onChange={(event) => onMinChange(event.target.value)}
      />
      <Input
        type="text"
        inputMode="decimal"
        placeholder="Max"
        aria-label={maxAriaLabel}
        aria-invalid={isInvalidBound(max, positive)}
        className={inputClassName}
        value={max ?? ""}
        onChange={(event) => onMaxChange(event.target.value)}
      />
    </div>
  );
}
