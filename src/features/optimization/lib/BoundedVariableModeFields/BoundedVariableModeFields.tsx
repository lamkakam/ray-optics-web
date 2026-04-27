"use client";

import { Input } from "@/shared/components/primitives/Input";
import { Label } from "@/shared/components/primitives/Label";
import { Paragraph } from "@/shared/components/primitives/Paragraph";

interface BoundedVariableModeFieldsProps {
  readonly idPrefix: string;
  readonly minLabel?: string;
  readonly minAriaLabel: string;
  readonly minValue: string;
  readonly onMinChange: (value: string) => void;
  readonly maxLabel?: string;
  readonly maxAriaLabel: string;
  readonly maxValue: string;
  readonly onMaxChange: (value: string) => void;
  readonly guidanceText?: ReadonlyArray<string>;
  readonly errorText?: string;
  readonly className?: string;
  readonly inputRowClassName?: string;
  readonly helperTextClassName?: string;
  readonly errorTextClassName?: string;
}

export function BoundedVariableModeFields({
  idPrefix,
  minLabel = "Min.",
  minAriaLabel,
  minValue,
  onMinChange,
  maxLabel = "Max.",
  maxAriaLabel,
  maxValue,
  onMaxChange,
  guidanceText,
  errorText,
  className,
  inputRowClassName = "grid gap-4 md:grid-cols-2",
  helperTextClassName,
  errorTextClassName,
}: BoundedVariableModeFieldsProps) {
  return (
    <div className={className ?? "grid gap-3"}>
      {guidanceText?.map((text) => (
        <Paragraph key={text} variant="caption" className={helperTextClassName}>
          {text}
        </Paragraph>
      ))}
      <div className={inputRowClassName}>
        <div>
          <Label htmlFor={`${idPrefix}-min`}>{minLabel}</Label>
          <Input
            id={`${idPrefix}-min`}
            aria-label={minAriaLabel}
            value={minValue}
            onChange={(event) => onMinChange(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-max`}>{maxLabel}</Label>
          <Input
            id={`${idPrefix}-max`}
            aria-label={maxAriaLabel}
            value={maxValue}
            onChange={(event) => onMaxChange(event.target.value)}
          />
        </div>
      </div>
      {errorText ? (
        <Paragraph variant="errorMessage" className={errorTextClassName}>
          {errorText}
        </Paragraph>
      ) : null}
    </div>
  );
}
