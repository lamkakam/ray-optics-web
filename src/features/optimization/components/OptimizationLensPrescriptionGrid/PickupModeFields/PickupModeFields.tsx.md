# `features/optimization/components/LensPrescriptionGrid/PickupModeFields/PickupModeFields.tsx`

Shared optimization-only pickup field group for source-surface based editors.

## Behavior

- Renders shared Source Surface Index, Scale, and Offset inputs with caller-owned labels and aria-labels by default.
- Renders the source surface field as the shared `Select` primitive when callers provide source-surface options, while preserving string values in `onSourceSurfaceChange`.
- Supports an optional extra field for specialized pickup flows such as asphere source coefficient selection.
- Renders the optional extra field as the shared `Select` primitive when callers provide extra-field options; otherwise renders it as an `Input`.
- Supports stacked or two-column scale/offset layouts so consuming modals can keep their existing arrangement.
- Does not own state; callers pass current values and field-level change handlers.
