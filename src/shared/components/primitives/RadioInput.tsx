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
}

export function RadioInput<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  disabled = false,
}: RadioInputProps<T>) {
  return (
    <fieldset className="mb-3">
      <legend className={`block text-sm font-medium mb-1 ${cx.label.color.textColor}`}>
        {label}
      </legend>
      <div className="flex flex-col gap-1">
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
