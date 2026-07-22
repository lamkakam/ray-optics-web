/**
# `features/optimization/lib/BoundedVariableModeFields/BoundedVariableModeFields.tsx`
*/
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

/**
## Behavior

- Renders shared Min/Max inputs with caller-owned visible labels and aria-labels.
- Supports optional helper copy and optional inline validation text so radius and toroid rows can show domain-specific guidance.
- Supports caller-owned layout classes so consuming modals can keep their existing spacing and grid arrangement.
- Renders validation text with `Paragraph` variant `errorMessage`; `errorTextClassName` is for caller-owned layout/spacing overrides, not color ownership.
- Does not own state; callers pass current values and field-level change handlers.
*/
/**
Shared optimization-only Min/Max field group for variable-mode editors.
*/
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
