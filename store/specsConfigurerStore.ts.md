# `store/specsConfigurerStore.ts`

## Purpose

Zustand slice for managing the optical specifications configuration form. Holds aperture, field, and wavelength settings as flat state and provides conversion helpers to/from `OpticalSpecs`.

## Exports

- `PupilSpace`, `PupilType`, `FieldSpace`, `FieldType`, `WavelengthWeights`, `ReferenceIndex` — type aliases derived from `OpticalSpecs` for use in form components.
- `SpecsConfigurerState` — interface describing all state fields and actions.
- `createSpecsConfigurerSlice` — `StateCreator<SpecsConfigurerState>` to be composed into a combined store.

## State

| Field | Type | Default |
|---|---|---|
| `pupilSpace` | `PupilSpace` | `"object"` |
| `pupilType` | `PupilType` | `"epd"` |
| `pupilValue` | `number` | `0.5` |
| `fieldSpace` | `FieldSpace` | `"object"` |
| `fieldType` | `FieldType` | `"height"` |
| `maxField` | `number` | `0` |
| `relativeFields` | `number[]` | `[0]` |
| `wavelengthWeights` | `WavelengthWeights` | `[[546.073, 1]]` (Note: `546.073` (e-line wavelength) is imported from `lib/fraunhoferLines`) |
| `referenceIndex` | `ReferenceIndex` | `0` |
| `committedSpecs` | `OpticalSpecs` | mirrors default form state (epd 0.5, height field maxField 0, e-line wavelength) |
| `fieldModalOpen` | `boolean` | `false` |
| `wavelengthModalOpen` | `boolean` | `false` |

## Actions

- `setAperture(patch)` — partial update for `pupilSpace`, `pupilType`, `pupilValue`; omitted keys are preserved.
- `setField(field)` — replaces all four field properties atomically.
- `setWavelengths(wl)` — replaces `wavelengthWeights` and `referenceIndex` atomically.
- `openFieldModal()` / `closeFieldModal()` — toggle `fieldModalOpen`.
- `openWavelengthModal()` / `closeWavelengthModal()` — toggle `wavelengthModalOpen`.
- `toOpticalSpecs()` — builds and returns an `OpticalSpecs` object from current state; `field.isRelative` is always `true`.
- `loadFromSpecs(specs)` — populates all form state fields from an `OpticalSpecs` object (used when loading a model); does NOT update `committedSpecs`.
- `setCommittedSpecs(specs)` — stores a committed snapshot of `OpticalSpecs`; called after a successful submit in `page.tsx`.
- `getFieldOptions()` — derives `{ label, value }[]` from `committedSpecs.field`; unit is `°` for angle, ` mm` for height.
- `getWavelengthOptions()` — derives `{ label, value }[]` from `committedSpecs.wavelengths.weights`.
- `clampFieldIndex(index, newSpecs?)` — clamps `index` to the last valid field index in `newSpecs` (if provided) or `committedSpecs`. Returns `Math.min(index, fields.length - 1)`.
- `clampWavelengthIndex(index, newSpecs?)` — clamps `index` to the last valid wavelength index in `newSpecs` (if provided) or `committedSpecs`. Returns `Math.min(index, weights.length - 1)`.

## Key Conventions

- `relativeFields` maps to `OpticalSpecs.field.fields`; `isRelative` is hardcoded to `true` in `toOpticalSpecs`.
- `wavelengthWeights` is an array of `[wavelength_nm, weight]` tuples.
- `referenceIndex` is a zero-based index into `wavelengthWeights`; callers must keep it in range.

## Dependencies

- `StateCreator` from `zustand` (type only).
- `OpticalSpecs` from `lib/opticalModel` (type only).
- `lookupWavelength` from `lib/fraunhoferLines` — used to seed the default e-line wavelength.

## Usages

Composed into the combined app store alongside other slices. Form components receive the relevant state fields and action callbacks as props via dependency injection rather than calling the store hook directly, to keep them testable.
