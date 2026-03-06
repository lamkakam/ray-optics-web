import { createStore } from "zustand/vanilla";
import {
  createSpecsConfigurerSlice,
  type SpecsConfigurerState,
} from "@/store/specsConfigurerStore";
import type { OpticalSpecs } from "@/lib/opticalModel";

function makeStore() {
  return createStore<SpecsConfigurerState>(createSpecsConfigurerSlice);
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

describe("specsConfigurerStore", () => {
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
