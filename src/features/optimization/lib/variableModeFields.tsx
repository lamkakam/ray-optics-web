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
 * Describes the Variable Mode Fields module.
 *
 * @remarks
 * ## Behavior
 *
 * - Exposes `getVariableModeFieldsRenderer(canUseBounds)` so modal rendering depends only on a caller-supplied boolean instead of optimizer-kind/method types.
 * - Returns `features/optimization/lib/BoundedVariableModeFields/BoundedVariableModeFields.tsx` when `canUseBounds === true`.
 * - Returns `features/optimization/lib/UnboundedVariableModeFields/UnboundedVariableModeFields.tsx` when `canUseBounds === false`.
 */
/**
 * Selects the variable-mode editor renderer for optimization modals from one method-aware mapping.
 *
 * @remarks
 * Type definitions for renderer props and return shape live in `features/optimization/types/optimizationVariableFieldTypes.ts`.
 */
export function getVariableModeFieldsRenderer(canUseBounds: boolean): VariableModeFieldsRenderer {
  return canUseBounds
    ? BOUNDED_VARIABLE_MODE_FIELDS_RENDERER
    : UNBOUNDED_VARIABLE_MODE_FIELDS_RENDERER;
}
