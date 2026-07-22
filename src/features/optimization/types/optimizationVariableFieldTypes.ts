/**
 * Shared variable-mode field prop and renderer types used by the variable field renderer helper.
 *
 * @remarks
 * ## Key Conventions
 *
 * - The renderer component returns `React.JSX.Element`.
 * - Runtime renderer selection stays in `features/optimization/lib/variableModeFields.tsx`.
 */
import type React from "react";

export interface VariableModeFieldsProps {
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

export interface VariableModeFieldsRenderer {
  readonly Component: (props: VariableModeFieldsProps) => React.JSX.Element;
}
