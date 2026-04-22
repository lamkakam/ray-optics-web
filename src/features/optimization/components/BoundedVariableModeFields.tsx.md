# `features/optimization/components/BoundedVariableModeFields.tsx`

Shared optimization-only Min/Max field group for variable-mode editors.

## Behavior

- Renders shared Min/Max inputs with caller-owned visible labels and aria-labels.
- Supports optional helper copy and optional inline validation text so radius and toroid rows can show domain-specific guidance.
- Supports caller-owned layout classes so consuming modals can keep their existing spacing and grid arrangement.
- Does not own state; callers pass current values and field-level change handlers.
