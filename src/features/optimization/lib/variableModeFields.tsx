import { BoundedVariableModeFields } from "@/features/optimization/components/BoundedVariableModeFields";
import { UnboundedVariableModeFields } from "@/features/optimization/components/UnboundedVariableModeFields";
import type {
  VariableModeFieldsProps,
  VariableModeFieldsRenderer,
} from "@/features/optimization/types/optimizationVariableFieldTypes";

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
