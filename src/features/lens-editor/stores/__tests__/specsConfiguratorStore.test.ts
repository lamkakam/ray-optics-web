import { createStore } from "zustand/vanilla";
import {
  createSpecsConfiguratorSlice,
  type SpecsConfiguratorState,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { OpticalSpecs } from "@/shared/lib/types/opticalModel";

function makeStore() {
  return createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
}

const sampleSpecs: OpticalSpecs = {
  pupil: { space: "image", type: "f/#", value: 4 },
  field: {
    space: "object",
    type: "angle",
    maxField: 20,
    fields: [0, 0.7, 1],
    isRelative: true,
  },
  wavelengths: {
    weights: [
      [486.133, 1],
      [587.562, 1],
      [656.273, 1],
    ],
    referenceIndex: 1,
  },
};

describe("specsConfiguratorStore", () => {
  describe("loadFromSpecs", () => {
    it("populates all aperture fields", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      const s = store.getState();
      expect(s.pupilSpace).toBe("image");
      expect(s.pupilType).toBe("f/#");
      expect(s.pupilValue).toBe(4);
    });

    it("populates all field fields", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      const s = store.getState();
      expect(s.fieldSpace).toBe("object");
      expect(s.fieldType).toBe("angle");
      expect(s.maxField).toBe(20);
      expect(s.relativeFields).toEqual([0, 0.7, 1]);
    });

    it("populates all wavelength fields", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      const s = store.getState();
      expect(s.wavelengthWeights).toEqual([
        [486.133, 1],
        [587.562, 1],
        [656.273, 1],
      ]);
      expect(s.referenceIndex).toBe(1);
    });
  });

  describe("setAperture", () => {
    it("updates pupilSpace and pupilType together", () => {
      const store = makeStore();
      store.getState().setAperture({ pupilSpace: "image", pupilType: "f/#" });
      const s = store.getState();
      expect(s.pupilSpace).toBe("image");
      expect(s.pupilType).toBe("f/#");
    });

    it("updates pupilValue alone", () => {
      const store = makeStore();
      store.getState().setAperture({ pupilValue: 25 });
      expect(store.getState().pupilValue).toBe(25);
    });

    it("can set pupilValue to 0", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      store.getState().setAperture({ pupilValue: 0 });
      expect(store.getState().pupilValue).toBe(0);
    });

    it("does not overwrite fields not included in the patch", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      store.getState().setAperture({ pupilValue: 99 });
      const s = store.getState();
      expect(s.pupilSpace).toBe("image");
      expect(s.pupilType).toBe("f/#");
      expect(s.pupilValue).toBe(99);
    });
  });

  describe("setField", () => {
    it("updates all field properties", () => {
      const store = makeStore();
      store.getState().setField({
        space: "image",
        type: "height",
        maxField: 10,
        relativeFields: [0, 0.5, 1],
      });
      const s = store.getState();
      expect(s.fieldSpace).toBe("image");
      expect(s.fieldType).toBe("height");
      expect(s.maxField).toBe(10);
      expect(s.relativeFields).toEqual([0, 0.5, 1]);
    });
  });

  describe("setWavelengths", () => {
    it("updates weights and referenceIndex", () => {
      const store = makeStore();
      store.getState().setWavelengths({
        weights: [[546.073, 1]],
        referenceIndex: 0,
      });
      const s = store.getState();
      expect(s.wavelengthWeights).toEqual([[546.073, 1]]);
      expect(s.referenceIndex).toBe(0);
    });
  });

  describe("toOpticalSpecs", () => {
    it("returns a valid OpticalSpecs from current state", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      const specs = store.getState().toOpticalSpecs();
      expect(specs).toEqual(sampleSpecs);
    });

    it("returns correct specs after modifications", () => {
      const store = makeStore();
      store.getState().loadFromSpecs(sampleSpecs);
      store.getState().setAperture({ pupilValue: 8 });
      const specs = store.getState().toOpticalSpecs();
      expect(specs.pupil.value).toBe(8);
      expect(specs.field).toEqual(sampleSpecs.field);
      expect(specs.wavelengths).toEqual(sampleSpecs.wavelengths);
    });
  });

  describe("committedSpecs", () => {
    it("initial value equals OpticalSpecs from default form state", () => {
      const store = makeStore();
      const committed = store.getState().committedSpecs;
      expect(committed).toEqual({
        pupil: { space: "object", type: "epd", value: 0.5 },
        field: { space: "object", type: "height", maxField: 0, fields: [0], isRelative: true },
        wavelengths: { weights: [[546.073, 1]], referenceIndex: 0 },
      });
    });

    it("setCommittedSpecs updates committedSpecs", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs);
      expect(store.getState().committedSpecs).toEqual(sampleSpecs);
    });

    it("getFieldOptions returns angle labels after setCommittedSpecs", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs);
      expect(store.getState().getFieldOptions()).toEqual([
        { label: "0.00°", value: 0 },
        { label: "14.0°", value: 1 },
        { label: "20.0°", value: 2 },
      ]);
    });

    it("getFieldOptions returns height labels for height type", () => {
      const store = makeStore();
      const heightSpecs: OpticalSpecs = {
        pupil: { space: "object", type: "epd", value: 25 },
        field: { space: "object", type: "height", maxField: 10, fields: [0, 0.5, 1], isRelative: true },
        wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
      };
      store.getState().setCommittedSpecs(heightSpecs);
      expect(store.getState().getFieldOptions()).toEqual([
        { label: "0.00 mm", value: 0 },
        { label: "5.00 mm", value: 1 },
        { label: "10.0 mm", value: 2 },
      ]);
    });

    it("getWavelengthOptions returns wavelength labels", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs);
      expect(store.getState().getWavelengthOptions()).toEqual([
        { label: "486.133 nm", value: 0 },
        { label: "587.562 nm", value: 1 },
        { label: "656.273 nm", value: 2 },
      ]);
    });

    it("getters are independent from loadFromSpecs (form state)", () => {
      const store = makeStore();
      // loadFromSpecs changes form state but NOT committedSpecs
      store.getState().loadFromSpecs(sampleSpecs);
      // committedSpecs is still the initial default
      const committed = store.getState().committedSpecs;
      expect(committed.field.type).toBe("height");
      expect(committed.field.maxField).toBe(0);
      // getFieldOptions still reflects initial committedSpecs, not loaded form state
      expect(store.getState().getFieldOptions()).toEqual([
        { label: "0.00 mm", value: 0 },
      ]);
    });
  });

  describe("clampFieldIndex", () => {
    it("returns index unchanged when in range", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs); // 3 fields
      expect(store.getState().clampFieldIndex(1)).toBe(1);
    });

    it("clamps index to last field when index exceeds count", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs); // 3 fields (indices 0,1,2)
      expect(store.getState().clampFieldIndex(5)).toBe(2);
    });

    it("handles single-field edge case (returns 0)", () => {
      const store = makeStore();
      // default committedSpecs has 1 field
      expect(store.getState().clampFieldIndex(3)).toBe(0);
    });

    it("uses provided newSpecs over committedSpecs when supplied", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs); // 3 fields
      const twoFieldSpecs: OpticalSpecs = {
        ...sampleSpecs,
        field: { ...sampleSpecs.field, fields: [0, 1] },
      };
      expect(store.getState().clampFieldIndex(5, twoFieldSpecs)).toBe(1);
    });
  });

  describe("clampWavelengthIndex", () => {
    it("returns index unchanged when in range", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs); // 3 wavelengths
      expect(store.getState().clampWavelengthIndex(2)).toBe(2);
    });

    it("clamps index to last wavelength when index exceeds count", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs); // 3 wavelengths (indices 0,1,2)
      expect(store.getState().clampWavelengthIndex(5)).toBe(2);
    });

    it("handles single-wavelength edge case (returns 0)", () => {
      const store = makeStore();
      // default committedSpecs has 1 wavelength
      expect(store.getState().clampWavelengthIndex(3)).toBe(0);
    });

    it("uses provided newSpecs over committedSpecs when supplied", () => {
      const store = makeStore();
      store.getState().setCommittedSpecs(sampleSpecs); // 3 wavelengths
      const twoWlSpecs: OpticalSpecs = {
        ...sampleSpecs,
        wavelengths: { weights: [[486.133, 1], [587.562, 1]], referenceIndex: 0 },
      };
      expect(store.getState().clampWavelengthIndex(5, twoWlSpecs)).toBe(1);
    });
  });

  describe("modal toggles", () => {
    it("opens and closes field modal", () => {
      const store = makeStore();
      expect(store.getState().fieldModalOpen).toBe(false);

      store.getState().openFieldModal();
      expect(store.getState().fieldModalOpen).toBe(true);

      store.getState().closeFieldModal();
      expect(store.getState().fieldModalOpen).toBe(false);
    });

    it("opens and closes wavelength modal", () => {
      const store = makeStore();
      expect(store.getState().wavelengthModalOpen).toBe(false);

      store.getState().openWavelengthModal();
      expect(store.getState().wavelengthModalOpen).toBe(true);

      store.getState().closeWavelengthModal();
      expect(store.getState().wavelengthModalOpen).toBe(false);
    });
  });
});
