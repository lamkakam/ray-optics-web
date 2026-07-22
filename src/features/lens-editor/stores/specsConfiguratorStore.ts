/**
 * Zustand slice for managing the optical specifications configuration form. Holds aperture, field, and wavelength settings as flat state and provides conversion helpers to/from `OpticalSpecs`.
 *
 * @remarks
 * ## Key Conventions
 *
 * - `relativeFields` maps to `OpticalSpecs.field.fields`; `isRelative` is hardcoded to `true` in `toOpticalSpecs`.
 * - `isWideAngle` maps to `OpticalSpecs.field.isWideAngle` and is normalized to `false` when absent in imported data.
 * - `wavelengthWeights` is an array of `[wavelength_nm, weight]` tuples.
 * - `referenceIndex` is a zero-based index into `wavelengthWeights`; callers must keep it in range.
 *
 * ## Dependencies
 *
 * - `StateCreator` from `zustand` (type only).
 * - `OpticalSpecs` from `@/shared/lib/types/opticalModel` (type only).
 * - `lookupWavelength` from `@/shared/lib/data/fraunhoferLines` — used to seed the default e-line wavelength.
 *
 * Form components receive state slices and actions as props via DI to keep them testable.
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
  /** Pupil coordinate space. Defaults to `"object"`. */
  pupilSpace: PupilSpace;
  /** Pupil specification type. Defaults to `"epd"`. */
  pupilType: PupilType;
  /** Pupil value. Defaults to `0.5`. */
  pupilValue: number;

  /** Field coordinate space. Defaults to `"object"`. */
  fieldSpace: FieldSpace;
  /** Field specification type. Defaults to `"height"`. */
  fieldType: FieldType;
  /** Maximum field value. Defaults to `0`. */
  maxField: number;
  /** Relative field samples mapped to `OpticalSpecs.field.fields`. Defaults to `[0]`. */
  relativeFields: number[];
  /** Whether wide-angle field handling is enabled. Defaults to `false`. */
  isWideAngle: boolean;

  /** Wavelength/weight tuples in nanometres. Defaults to the e-line with weight `1`. */
  wavelengthWeights: WavelengthWeights;
  /** Zero-based reference wavelength index. Defaults to `0`; callers keep it in range. */
  referenceIndex: ReferenceIndex;

  /** Last committed specifications snapshot. Initially mirrors the default form state. */
  committedSpecs: OpticalSpecs;
  /** Stores the committed specifications snapshot after a successful submit. */
  setCommittedSpecs: (specs: OpticalSpecs) => void;
  /** Derives field selector options from `committedSpecs`, using degrees for angles and millimetres for heights. */
  getFieldOptions: () => { label: string; value: number }[];
  /** Derives wavelength selector options from `committedSpecs`, labelled in nanometres. */
  getWavelengthOptions: () => { label: string; value: number }[];

  /** Clamps only the upper bound of a field index to the last field in `newSpecs`, or in `committedSpecs` when omitted. */
  clampFieldIndex: (index: number, newSpecs?: OpticalSpecs) => number;
  /** Clamps only the upper bound of a wavelength index to the last wavelength in `newSpecs`, or in `committedSpecs` when omitted. */
  clampWavelengthIndex: (index: number, newSpecs?: OpticalSpecs) => number;

  /** Whether the field configuration modal is open. Defaults to `false`. */
  fieldModalOpen: boolean;
  /** Whether the wavelength configuration modal is open. Defaults to `false`. */
  wavelengthModalOpen: boolean;

  /** Partially updates aperture state, preserving omitted properties. */
  setAperture: (patch: {
    pupilSpace?: PupilSpace;
    pupilType?: PupilType;
    pupilValue?: number;
  }) => void;
  /** Atomically replaces all field properties, including wide-angle mode. */
  setField: (field: {
    space: FieldSpace;
    type: FieldType;
    maxField: number;
    relativeFields: number[];
    isWideAngle: boolean;
  }) => void;
  /** Atomically replaces wavelength weights and the reference index. */
  setWavelengths: (wl: {
    weights: WavelengthWeights;
    referenceIndex: ReferenceIndex;
  }) => void;
  /** Opens the field configuration modal. */
  openFieldModal: () => void;
  /** Closes the field configuration modal. */
  closeFieldModal: () => void;
  /** Opens the wavelength configuration modal. */
  openWavelengthModal: () => void;
  /** Closes the wavelength configuration modal. */
  closeWavelengthModal: () => void;
  /** Builds current form state as `OpticalSpecs`, always emitting relative fields and a boolean wide-angle flag. */
  toOpticalSpecs: () => OpticalSpecs;
  /** Loads form fields from specifications without changing `committedSpecs`; a missing wide-angle flag becomes `false`. */
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
