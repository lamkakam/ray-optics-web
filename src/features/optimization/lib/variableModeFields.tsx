import React from "react";
import { BoundedVariableModeFields } from "@/features/optimization/components/BoundedVariableModeFields";
import { UnboundedVariableModeFields } from "@/features/optimization/components/UnboundedVariableModeFields";

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

interface VariableModeFieldsRenderer {
  readonly Component: (props: VariableModeFieldsProps) => React.JSX.Element;
}

const BOUNDED_VARIABLE_MODE_FIELDS_RENDERER: VariableModeFieldsRenderer = {
  Component: (props) => <BoundedVariableModeFields {...props} />,
};

const UNBOUNDED_VARIABLE_MODE_FIELDS_RENDERER: VariableModeFieldsRenderer = {
  Component: ({ className }) => <UnboundedVariableModeFields className={className} />,
};

export function getVariableModeFieldsRenderer(canUseBounds: boolean): VariableModeFieldsRenderer {
  return canUseBounds
    ? BOUNDED_VARIABLE_MODE_FIELDS_RENDERER
    : UNBOUNDED_VARIABLE_MODE_FIELDS_RENDERER;
}
