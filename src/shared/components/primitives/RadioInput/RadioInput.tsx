import React from "react";
import { componentTokens as cx } from "@/shared/tokens/styleTokens";

const OPTION_ROW_CLASSES = [
  "flex items-center text-sm",
  cx.radio.size.gap,
  cx.radio.size.wrapperPaddingX,
  cx.radio.size.wrapperPaddingY,
  cx.radio.color.hoverBgColor,
  cx.radio.color.labelTextColor,
  cx.radio.style.wrapperBorderRadius,
  cx.radio.style.transition,
  cx.radio.style.cursor,
] as const;

const OPTION_GRID_CLASSES = {
  full: {
    1: "grid grid-cols-1 gap-1",
    2: "grid grid-cols-2 gap-1",
    3: "grid grid-cols-3 gap-1",
    4: "grid grid-cols-4 gap-1",
  },
  compact: {
    1: "inline-grid grid-cols-1 gap-x-6 gap-y-1",
    2: "inline-grid grid-cols-2 gap-x-6 gap-y-1",
    3: "inline-grid grid-cols-3 gap-x-6 gap-y-1",
    4: "inline-grid grid-cols-4 gap-x-6 gap-y-1",
  },
} as const;

type RadioInputLayout = keyof typeof OPTION_GRID_CLASSES;

export type RadioOption<T extends string> = {
  value: T;
  label: string;
  /** Optional React node rendered as the visual label. When provided, replaces the plain `label` text. The `label` string is always used as `aria-label`. */
  labelNode?: React.ReactNode;
};

interface RadioInputProps<T extends string> {
  readonly name: string;
  readonly label: string;
  readonly options: ReadonlyArray<RadioOption<T>>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
  readonly columns?: 1 | 2 | 3 | 4;
  readonly layout?: RadioInputLayout;
}

export function RadioInput<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  disabled = false,
  columns = 1,
  layout = "full",
}: RadioInputProps<T>) {
  return (
    <fieldset className="mb-3">
      <legend className={`block text-sm font-medium mb-1 ${cx.label.color.textColor}`}>
        {label}
      </legend>
      <div className={OPTION_GRID_CLASSES[layout][columns]}>
        {options.map((opt) => (
          <label key={opt.value} className={OPTION_ROW_CLASSES.join(" ")}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={disabled}
              aria-label={opt.label}
              onChange={() => onChange(opt.value)}
              className={cx.radio.color.checkedColor}
            />
            {opt.labelNode ?? opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
