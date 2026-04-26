# `features/optimization/lib/modalHelpers.ts`

Pure helper utilities shared by optimization variable/pickup modals.

## Exports

- `MODAL_MODE_OPTIONS`: shared select options for `constant`, `variable`, and `pickup`
- `ModalModeChoice`: union type for modal mode selection values
- `CURVATURE_RADIUS_GUIDANCE_TEXT`: shared helper copy for curvature-radius style variable bounds where `R = 0` means a flat surface
- `getCurvatureRadiusBoundsErrorText(label)`: formats the shared zero-crossing validation message for a caller-provided field label
- `curvatureRadiusCrossesZero(minValue, maxValue)`: returns `true` only when both bounds are finite and the interval straddles `0`
- `createVariableDraft(value)`: returns a variable draft with both bounds seeded from the current numeric value
- `createPickupDraft()`: returns the default pickup draft with source surface `1`, scale `1`, and offset `0`
- `getRadiusPickupSourceSurfaceOptions(realSurfaceCount, targetSurfaceIndex)`: returns real-surface options plus an `Image` option, omitting the target surface index
- `getThicknessPickupSourceSurfaceOptions(realSurfaceCount, targetSurfaceIndex)`: returns real-surface options only, omitting the target surface index
- `toRadiusModeDraft(mode)`: removes `surfaceIndex` from a committed `RadiusMode` to seed modal-local draft state
- `serializeRadiusMode(mode)`: converts a committed `RadiusMode` into a stable string for keyed modal remounting

## Behavior

- `CURVATURE_RADIUS_GUIDANCE_TEXT` and `getCurvatureRadiusBoundsErrorText()` are shared by `RadiusModeModal` and the toroid-sweep variable row in `AsphereVarModal` so the flat-surface guidance and zero-crossing error copy stay in sync.
- `curvatureRadiusCrossesZero()` is intended for curvature-radius style bounds, where `R = 0` represents a flat surface with infinite radius and bounds must stay entirely negative or entirely positive.
- The draft builders are shared by both `RadiusModeModal` and `ThicknessModeModal` to keep default mode transitions consistent.
- The pickup source-surface option builders keep radius and thickness dropdown bounds consistent with their optimizer validation rules.
