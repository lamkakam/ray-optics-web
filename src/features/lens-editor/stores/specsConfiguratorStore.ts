/**
 * Zustand slice for managing the optical specifications configuration form. Holds aperture, field, and wavelength settings as flat state and provides conversion helpers to/from `OpticalSpecs`.
 *
 * @remarks
 * ## Key Conventions
 *
 * - `fields` maps directly to `OpticalSpecs.field.fields`; `isRelative` determines whether the samples are interpreted relative to `maxField` or as physical coordinates. Absolute imported samples remain unchanged.
 * - `isWideAngle` maps to `OpticalSpecs.field.isWideAngle`; omitted values normalize to `false`, while explicit values are preserved for every supported field type.
 * - `wavelengthWeights` is an array of `[wavelength_nm, weight]` tuples.
 * - `referenceIndex` is a zero-based index into `wavelengthWeights`; callers must keep it in range.
 * - `toOpticalSpecs` emits the strict relative/absolute `FieldSpec` discriminant and rejects invalid cross-products instead of constructing Object F/#, Image EPD/NA, or Image Angle.
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
import type {
  FieldSpec,
  OpticalSpecs,
  PupilSpec,
} from "@/shared/lib/types/opticalModel";
import { lookupWavelength } from "@/shared/lib/data/fraunhoferLines";

/** Reusable type aliases derived from OpticalSpecs */
export type PupilSpace = OpticalSpecs["pupil"]["space"];
export type PupilType = OpticalSpecs["pupil"]["type"];
export type FieldSpace = OpticalSpecs["field"]["space"];
export type FieldType = OpticalSpecs["field"]["type"];
export type WavelengthWeights = OpticalSpecs["wavelengths"]["weights"];
export type ReferenceIndex = OpticalSpecs["wavelengths"]["referenceIndex"];

/** Field editor values accepted by the store; relative values require `maxField`, while absolute values deliberately omit it. */
export type FieldConfig =
  | {
      readonly space: FieldSpace;
      readonly type: FieldType;
      readonly maxField: number;
      readonly fields: number[];
      readonly isRelative: true;
      readonly isWideAngle: boolean;
    }
  | {
      readonly space: FieldSpace;
      readonly type: FieldType;
      readonly fields: number[];
      readonly isRelative: false;
      readonly isWideAngle: boolean;
      readonly maxField?: never;
    };

/** Converts optional UI/import state into the supported wide-angle boolean. */
function normalizeWideAngle(isWideAngle: boolean | undefined): boolean {
  return isWideAngle === true;
}

/** Returns a specification snapshot with an explicit wide-angle boolean. */
function normalizeOpticalSpecs(specs: OpticalSpecs): OpticalSpecs {
  return {
    ...specs,
    field: {
      ...specs.field,
      isWideAngle: normalizeWideAngle(specs.field.isWideAngle),
    },
  };
}

function buildPupilSpec(
  space: PupilSpace,
  type: PupilType,
  value: number,
): PupilSpec {
  if (space === "image" && type === "f/#") {
    return { space, type, value };
  }
  if (space === "object" && (type === "epd" || type === "NA")) {
    return { space, type, value };
  }
  throw new Error(`Invalid pupil specification: ${space} ${type}`);
}

function buildFieldSpec(
  space: FieldSpace,
  type: FieldType,
  maxField: number,
  fields: number[],
  isRelative: boolean,
  isWideAngle: boolean,
): FieldSpec {
  if (space === "image" && type === "height") {
    return isRelative
      ? {
          space,
          type,
          maxField,
          fields,
          isRelative: true,
          isWideAngle: normalizeWideAngle(isWideAngle),
        }
      : {
          space,
          type,
          fields,
          isRelative: false,
          isWideAngle: normalizeWideAngle(isWideAngle),
        };
  }
  if (space === "object") {
    return isRelative
      ? {
          space,
          type,
          maxField,
          fields,
          isRelative: true,
          isWideAngle: normalizeWideAngle(isWideAngle),
        }
      : {
          space,
          type,
          fields,
          isRelative: false,
          isWideAngle: normalizeWideAngle(isWideAngle),
        };
  }
  throw new Error(`Invalid field specification: ${space} ${type}`);
}

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
  /** Maximum relative field value draft. It is retained while absolute mode is active. Defaults to `0`. */
  maxField: number;
  /** Field samples mapped directly to `OpticalSpecs.field.fields`; their interpretation is selected by `isRelative`. Defaults to `[0]`. */
  fields: number[];
  /** Whether `fields` contains relative samples scaled by `maxField`. Defaults to `true`. */
  isRelative: boolean;
  /** Whether wide-angle field handling is enabled. Defaults to `false`. */
  isWideAngle: boolean;

  /** Wavelength/weight tuples in nanometres. Defaults to the e-line with weight `1`. */
  wavelengthWeights: WavelengthWeights;
  /** Zero-based reference wavelength index. Defaults to `0`; callers keep it in range. */
  referenceIndex: ReferenceIndex;

  /** Last committed specifications snapshot with an explicit wide-angle boolean. Initially mirrors the default form state. */
  committedSpecs: OpticalSpecs;
  /** Stores the committed specifications snapshot after a successful submit. */
  setCommittedSpecs: (specs: OpticalSpecs) => void;
  /** Derives physical field selector options from `committedSpecs`, scaling relative samples and displaying absolute samples directly. */
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
  /** Atomically replaces all field properties; absolute updates omit `maxField` so the hidden relative maximum draft is retained. */
  setField: (field: FieldConfig) => void;
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
  /** Builds current form state as `OpticalSpecs`, conditionally emitting `maxField` for relative fields and a normalized boolean wide-angle flag. */
  toOpticalSpecs: () => OpticalSpecs;
  /** Loads specifications into the neutral field form without changing `committedSpecs`; absolute samples and their interpretation are preserved, and a missing wide-angle flag becomes `false`. */
  loadFromSpecs: (specs: OpticalSpecs) => void;
}

export const createSpecsConfiguratorSlice: StateCreator<
  SpecsConfiguratorState
> = (set, get) => ({
  // Aperture defaults
  pupilSpace: "object",
  pupilType: "epd",
  pupilValue: 0.5,

  // Field defaults
  fieldSpace: "object",
  fieldType: "height",
  maxField: 0,
  fields: [0],
  isRelative: true,
  isWideAngle: false,

  // Wavelength defaults
  wavelengthWeights: [[lookupWavelength("e"), 1]],
  referenceIndex: 0,

  // Committed specs defaults (mirrors default form state above)
  committedSpecs: {
    pupil: { space: "object", type: "epd", value: 0.5 },
    field: {
      space: "object",
      type: "height",
      maxField: 0,
      fields: [0],
      isRelative: true,
      isWideAngle: false,
    },
    wavelengths: { weights: [[lookupWavelength("e"), 1]], referenceIndex: 0 },
  },

  setCommittedSpecs: (specs) =>
    set({ committedSpecs: normalizeOpticalSpecs(specs) }),

  clampFieldIndex: (index, newSpecs) => {
    const specs = newSpecs ?? get().committedSpecs;
    return Math.min(index, specs.field.fields.length - 1);
  },
  clampWavelengthIndex: (index, newSpecs) => {
    const specs = newSpecs ?? get().committedSpecs;
    return Math.min(index, specs.wavelengths.weights.length - 1);
  },

  getFieldOptions: () => {
    const field = get().committedSpecs.field;
    const unit = field.type === "angle" ? "°" : " mm";
    return field.fields.map((sample, i) => ({
      label: `${(field.isRelative ? sample * field.maxField : sample).toPrecision(3)}${unit}`,
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
    set((state) => ({
      fieldSpace: field.space,
      fieldType: field.type,
      maxField: field.isRelative ? field.maxField : state.maxField,
      fields: field.fields,
      isRelative: field.isRelative,
      isWideAngle: normalizeWideAngle(field.isWideAngle),
    })),

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
      pupil: buildPupilSpec(s.pupilSpace, s.pupilType, s.pupilValue),
      field: buildFieldSpec(
        s.fieldSpace,
        s.fieldType,
        s.maxField,
        s.fields,
        s.isRelative,
        s.isWideAngle,
      ),
      wavelengths: {
        weights: s.wavelengthWeights,
        referenceIndex: s.referenceIndex,
      },
    };
  },

  loadFromSpecs: (specs) => {
    set({
      pupilSpace: specs.pupil.space,
      pupilType: specs.pupil.type,
      pupilValue: specs.pupil.value,
      fieldSpace: specs.field.space,
      fieldType: specs.field.type,
      maxField: specs.field.isRelative ? specs.field.maxField : get().maxField,
      fields: specs.field.fields,
      isRelative: specs.field.isRelative,
      isWideAngle: normalizeWideAngle(specs.field.isWideAngle),
      wavelengthWeights: specs.wavelengths.weights,
      referenceIndex: specs.wavelengths.referenceIndex,
    });
  },
});
