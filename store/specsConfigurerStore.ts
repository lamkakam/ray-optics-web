import type { StateCreator } from "zustand";
import type { OpticalSpecs } from "@/lib/opticalModel";

export interface SpecsConfigurerState {
  // Aperture
  pupilSpace: "object" | "image";
  pupilType: "epd" | "f/#" | "NA";
  pupilValue: number;

  // Field
  fieldSpace: "object" | "image";
  fieldType: "angle" | "height";
  maxField: number;
  relativeFields: number[];

  // Wavelengths
  wavelengthWeights: [number, number][];
  referenceIndex: number;

  // Modal state
  fieldModalOpen: boolean;
  wavelengthModalOpen: boolean;

  // Actions
  setAperture: (patch: {
    pupilSpace?: "object" | "image";
    pupilType?: "epd" | "f/#" | "NA";
    pupilValue?: number;
  }) => void;
  setField: (field: {
    space: "object" | "image";
    type: "angle" | "height";
    maxField: number;
    relativeFields: number[];
  }) => void;
  setWavelengths: (wl: {
    weights: [number, number][];
    referenceIndex: number;
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
  wavelengthWeights: [[546.073, 1]],
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
