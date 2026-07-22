/**
Zustand slice for managing the optical specifications configuration form. Holds aperture, field, and wavelength settings as flat state and provides conversion helpers to/from `OpticalSpecs`.

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
| `isWideAngle` | `boolean` | `false` |
| `wavelengthWeights` | `WavelengthWeights` | `[[546.073, 1]]` (Note: `546.073` (e-line wavelength) is imported from `@/shared/lib/data/fraunhoferLines`) |
| `referenceIndex` | `ReferenceIndex` | `0` |
| `committedSpecs` | `OpticalSpecs` | mirrors default form state (epd 0.5, height field maxField 0, e-line wavelength) |
| `fieldModalOpen` | `boolean` | `false` |
| `wavelengthModalOpen` | `boolean` | `false` |

## Actions

- `setAperture(patch)` — partial update for `pupilSpace`, `pupilType`, `pupilValue`; omitted keys are preserved.
- `setField(field)` — replaces all field properties atomically, including `isWideAngle`.
- `setWavelengths(wl)` — replaces `wavelengthWeights` and `referenceIndex` atomically.
- `openFieldModal()` / `closeFieldModal()` — toggle `fieldModalOpen`.
- `openWavelengthModal()` / `closeWavelengthModal()` — toggle `wavelengthModalOpen`.
- `toOpticalSpecs()` — builds and returns an `OpticalSpecs` object from current state; `field.isRelative` is always `true`, and `field.isWideAngle` is always emitted as a boolean.
- `loadFromSpecs(specs)` — populates all form state fields from an `OpticalSpecs` object (used when loading a model); does NOT update `committedSpecs`. Missing `field.isWideAngle` defaults to `false`.
- `setCommittedSpecs(specs)` — stores a committed snapshot of `OpticalSpecs`; called after a successful submit in `page.tsx`.
- `getFieldOptions()` — derives `{ label, value }[]` from `committedSpecs.field`; unit is `°` for angle, ` mm` for height.
- `getWavelengthOptions()` — derives `{ label, value }[]` from `committedSpecs.wavelengths.weights`.
- `clampFieldIndex(index, newSpecs?)` — clamps `index` to the last valid field index in `newSpecs` (if provided) or `committedSpecs`. Returns `Math.min(index, fields.length - 1)`.
- `clampWavelengthIndex(index, newSpecs?)` — clamps `index` to the last valid wavelength index in `newSpecs` (if provided) or `committedSpecs`. Returns `Math.min(index, weights.length - 1)`.

## Key Conventions

- `relativeFields` maps to `OpticalSpecs.field.fields`; `isRelative` is hardcoded to `true` in `toOpticalSpecs`.
- `isWideAngle` maps to `OpticalSpecs.field.isWideAngle` and is normalized to `false` when absent in imported data.
- `wavelengthWeights` is an array of `[wavelength_nm, weight]` tuples.
- `referenceIndex` is a zero-based index into `wavelengthWeights`; callers must keep it in range.

## Dependencies

- `StateCreator` from `zustand` (type only).
- `OpticalSpecs` from `@/shared/lib/types/opticalModel` (type only).
- `lookupWavelength` from `@/shared/lib/data/fraunhoferLines` — used to seed the default e-line wavelength.

Form components receive state slices and actions as props via DI to keep them testable.
*/
import type { StateCreator } from "zustand";
import type { OpticalSpecs } from "@/shared/lib/types/opticalModel";
import { lookupWavelength } from "@/shared/lib/data/fraunhoferLines";

/** Reusable type aliases derived from OpticalSpecs */
export type PupilSpace = OpticalSpecs["pupil"]["space"];
export type PupilType = OpticalSpecs["pupil"]["type"];
export type FieldSpace = OpticalSpecs["field"]["space"];
export type FieldType = OpticalSpecs["field"]["type"];
export type WavelengthWeights = OpticalSpecs["wavelengths"]["weights"];
export type ReferenceIndex = OpticalSpecs["wavelengths"]["referenceIndex"];

export interface SpecsConfiguratorState {
  // Aperture
  pupilSpace: PupilSpace;
  pupilType: PupilType;
  pupilValue: number;

  // Field
  fieldSpace: FieldSpace;
  fieldType: FieldType;
  maxField: number;
  relativeFields: number[];
  isWideAngle: boolean;

  // Wavelengths
  wavelengthWeights: WavelengthWeights;
  referenceIndex: ReferenceIndex;

  // Committed specs (snapshot of last submitted form state)
  committedSpecs: OpticalSpecs;
  setCommittedSpecs: (specs: OpticalSpecs) => void;
  getFieldOptions: () => { label: string; value: number }[];
  getWavelengthOptions: () => { label: string; value: number }[];

  // Clamping helpers
  clampFieldIndex: (index: number, newSpecs?: OpticalSpecs) => number;
  clampWavelengthIndex: (index: number, newSpecs?: OpticalSpecs) => number;

  // Modal state
  fieldModalOpen: boolean;
  wavelengthModalOpen: boolean;

  // Actions
  setAperture: (patch: {
    pupilSpace?: PupilSpace;
    pupilType?: PupilType;
    pupilValue?: number;
  }) => void;
  setField: (field: {
    space: FieldSpace;
    type: FieldType;
    maxField: number;
    relativeFields: number[];
    isWideAngle: boolean;
  }) => void;
  setWavelengths: (wl: {
    weights: WavelengthWeights;
    referenceIndex: ReferenceIndex;
  }) => void;
  openFieldModal: () => void;
  closeFieldModal: () => void;
  openWavelengthModal: () => void;
  closeWavelengthModal: () => void;
  toOpticalSpecs: () => OpticalSpecs;
  loadFromSpecs: (specs: OpticalSpecs) => void;
}

export const createSpecsConfiguratorSlice: StateCreator<SpecsConfiguratorState> = (
  set,
  get
) => ({
  // Aperture defaults
  pupilSpace: "object",
  pupilType: "epd",
  pupilValue: 0.5,

  // Field defaults
  fieldSpace: "object",
  fieldType: "height",
  maxField: 0,
  relativeFields: [0],
  isWideAngle: false,

  // Wavelength defaults
  wavelengthWeights: [[lookupWavelength("e"), 1]],
  referenceIndex: 0,

  // Committed specs defaults (mirrors default form state above)
  committedSpecs: {
    pupil: { space: "object", type: "epd", value: 0.5 },
    field: { space: "object", type: "height", maxField: 0, fields: [0], isRelative: true, isWideAngle: false },
    wavelengths: { weights: [[lookupWavelength("e"), 1]], referenceIndex: 0 },
  },

  setCommittedSpecs: (specs) => set({ committedSpecs: specs }),

  clampFieldIndex: (index, newSpecs) => {
    const specs = newSpecs ?? get().committedSpecs;
    return Math.min(index, specs.field.fields.length - 1);
  },
  clampWavelengthIndex: (index, newSpecs) => {
    const specs = newSpecs ?? get().committedSpecs;
    return Math.min(index, specs.wavelengths.weights.length - 1);
  },

  getFieldOptions: () => {
    const { fields, maxField, type } = get().committedSpecs.field;
    const unit = type === "angle" ? "°" : " mm";
    return fields.map((rf, i) => ({
      label: `${(rf * maxField).toPrecision(3)}${unit}`,
      value: i,
    }));
  },

  getWavelengthOptions: () =>
    get().committedSpecs.wavelengths.weights.map(([wl], i) => ({
      label: `${wl} nm`,
      value: i,
    })),

  // Modal state
  fieldModalOpen: false,
  wavelengthModalOpen: false,

  setAperture: (patch) =>
    set((state) => ({
      pupilSpace: patch.pupilSpace ?? state.pupilSpace,
      pupilType: patch.pupilType ?? state.pupilType,
      pupilValue: patch.pupilValue ?? state.pupilValue,
    })),

  setField: (field) =>
    set({
      fieldSpace: field.space,
      fieldType: field.type,
      maxField: field.maxField,
      relativeFields: field.relativeFields,
      isWideAngle: field.isWideAngle,
    }),

  setWavelengths: (wl) =>
    set({
      wavelengthWeights: wl.weights,
      referenceIndex: wl.referenceIndex,
    }),

  openFieldModal: () => set({ fieldModalOpen: true }),
  closeFieldModal: () => set({ fieldModalOpen: false }),
  openWavelengthModal: () => set({ wavelengthModalOpen: true }),
  closeWavelengthModal: () => set({ wavelengthModalOpen: false }),

  toOpticalSpecs: (): OpticalSpecs => {
    const s = get();
    return {
      pupil: {
        space: s.pupilSpace,
        type: s.pupilType,
        value: s.pupilValue,
      },
      field: {
        space: s.fieldSpace,
        type: s.fieldType,
        maxField: s.maxField,
        fields: s.relativeFields,
        isRelative: true,
        isWideAngle: s.isWideAngle,
      },
      wavelengths: {
        weights: s.wavelengthWeights,
        referenceIndex: s.referenceIndex,
      },
    };
  },

  loadFromSpecs: (specs) =>
    set({
      pupilSpace: specs.pupil.space,
      pupilType: specs.pupil.type,
      pupilValue: specs.pupil.value,
      fieldSpace: specs.field.space,
      fieldType: specs.field.type,
      maxField: specs.field.maxField,
      relativeFields: specs.field.fields,
      isWideAngle: specs.field.isWideAngle ?? false,
      wavelengthWeights: specs.wavelengths.weights,
      referenceIndex: specs.wavelengths.referenceIndex,
    }),
});
