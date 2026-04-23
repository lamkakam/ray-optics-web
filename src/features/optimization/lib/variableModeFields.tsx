import React from "react";
import type { LeastSquaresMethod, OptimizerKind } from "@/shared/lib/types/optimization";
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
  readonly usesBounds: boolean;
}

const boundedVariableModeFieldsRenderer: VariableModeFieldsRenderer = {
  Component: (props) => <BoundedVariableModeFields {...props} />,
  usesBounds: true,
};

const unboundedVariableModeFieldsRenderer: VariableModeFieldsRenderer = {
  Component: ({ className }) => <UnboundedVariableModeFields className={className} />,
  usesBounds: false,
};

export const VARIABLE_MODE_FIELDS_BY_OPTIMIZER = {
  least_squares: {
    trf: boundedVariableModeFieldsRenderer,
    lm: unboundedVariableModeFieldsRenderer,
  },
} satisfies Record<OptimizerKind, Record<LeastSquaresMethod, VariableModeFieldsRenderer>>;

export function getVariableModeFieldsRenderer(
  optimizerKind: OptimizerKind,
  optimizerMethod: LeastSquaresMethod,
): VariableModeFieldsRenderer {
  return VARIABLE_MODE_FIELDS_BY_OPTIMIZER[optimizerKind][optimizerMethod];
}
