import { BoundedVariableModeFields } from "@/features/optimization/lib/BoundedVariableModeFields/BoundedVariableModeFields";
import { UnboundedVariableModeFields } from "@/features/optimization/lib/UnboundedVariableModeFields/UnboundedVariableModeFields";
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

/**
 * Selects the variable-mode editor renderer for optimization modals from one method-aware mapping.
 *
 * @remarks
 * The caller supplies only whether bounds are supported, keeping this helper
 * independent of optimizer-kind and method types. It returns the bounded field
 * component when `canUseBounds` is true and the unbounded component otherwise.
 *
 * Type definitions for renderer props and return shape live in `features/optimization/types/optimizationVariableFieldTypes.ts`.
 */
export function getVariableModeFieldsRenderer(canUseBounds: boolean): VariableModeFieldsRenderer {
  return canUseBounds
    ? BOUNDED_VARIABLE_MODE_FIELDS_RENDERER
    : UNBOUNDED_VARIABLE_MODE_FIELDS_RENDERER;
}
