# `features/optimization/lib/modalHelpers.ts`

Pure helper utilities shared by optimization variable/pickup modals.

## Exports

- `MODAL_MODE_OPTIONS`: shared select options for `constant`, `variable`, and `pickup`
- `ModalModeChoice`: union type for modal mode selection values
- `curvatureRadiusCrossesZero(minValue, maxValue)`: returns `true` only when both bounds are finite and the interval straddles `0`
- `createVariableDraft(value)`: returns a variable draft with both bounds seeded from the current numeric value
- `createPickupDraft()`: returns the default pickup draft with source surface `1`, scale `1`, and offset `0`
- `toRadiusModeDraft(mode)`: removes `surfaceIndex` from a committed `RadiusMode` to seed modal-local draft state
- `serializeRadiusMode(mode)`: converts a committed `RadiusMode` into a stable string for keyed modal remounting

## Behavior

- `curvatureRadiusCrossesZero()` is intended for curvature-radius style bounds, where `R = 0` represents a flat surface with infinite radius and bounds must stay entirely negative or entirely positive.
- The draft builders are shared by both `RadiusModeModal` and `ThicknessModeModal` to keep default mode transitions consistent.
