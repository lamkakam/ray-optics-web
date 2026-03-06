import type { StateCreator } from "zustand";
import type { OpticalSpecs } from "@/lib/opticalModel";
import { lookupWavelength } from "@/lib/fraunhoferLines";

/** Reusable type aliases derived from OpticalSpecs */
export type PupilSpace = OpticalSpecs["pupil"]["space"];
export type PupilType = OpticalSpecs["pupil"]["type"];
export type FieldSpace = OpticalSpecs["field"]["space"];
export type FieldType = OpticalSpecs["field"]["type"];
export type WavelengthWeights = OpticalSpecs["wavelengths"]["weights"];
export type ReferenceIndex = OpticalSpecs["wavelengths"]["referenceIndex"];

export interface SpecsConfigurerState {
  // Aperture
  pupilSpace: PupilSpace;
  pupilType: PupilType;
  pupilValue: number;

  // Field
  fieldSpace: FieldSpace;
  fieldType: FieldType;
  maxField: number;
  relativeFields: number[];

  // Wavelengths
  wavelengthWeights: WavelengthWeights;
  referenceIndex: ReferenceIndex;

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

export const createSpecsConfigurerSlice: StateCreator<SpecsConfigurerState> = (
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

  // Wavelength defaults
  wavelengthWeights: [[lookupWavelength("e"), 1]],
  referenceIndex: 0,

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
      wavelengthWeights: specs.wavelengths.weights,
      referenceIndex: specs.wavelengths.referenceIndex,
    }),
});
