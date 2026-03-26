import React from "react";
import { componentTokens as cx } from "@/components/ui/styleTokens";

export type RadioOption<T extends string> = { value: T; label: string };

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
          <label key={opt.value} className={`flex items-center gap-2 text-sm cursor-pointer ${cx.label.color.textColor}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={disabled}
              aria-label={opt.label}
              onChange={() => onChange(opt.value)}
              className="accent-blue-600"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
