/** Covers result storage and atomic source-model ownership, including replacement and clearing. */
import { createStore } from "zustand/vanilla";
import {
  createAnalysisDataSlice,
  type AnalysisDataState,
} from "@/features/analysis/stores/analysisDataStore";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 100, medium: "air", manufacturer: "" },
  surfaces: [],
  image: { curvatureRadius: 0 },
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: { space: "object", type: "angle", fields: [0], isRelative: false },
    wavelengths: { weights: [[550, 1]], referenceIndex: 0 },
  },
};

const mockSeidelData: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II"],
    surfaceLabels: ["S1", "sum"],
    data: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  },
  transverse: { TSA: 1, TCO: 2, TAS: 3, SAS: 4, PTB: 5, DST: 6 },
  wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
  curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
};

function makeStore() {
  return createStore<AnalysisDataState>(createAnalysisDataSlice);
}

describe("analysisDataStore", () => {
  describe("initial state", () => {
    it("seidelData is undefined by default", () => {
      const store = makeStore();
      expect(store.getState().seidelData).toBeUndefined();
      expect(store.getState().seidelDataModel).toBeUndefined();
    });

    it("firstOrderData is undefined by default", () => {
      const store = makeStore();
      expect(store.getState().firstOrderData).toBeUndefined();
      expect(store.getState().firstOrderDataModel).toBeUndefined();
    });
  });

  describe("setSeidelData", () => {
    it("publishes the payload and exact source together, replacing previous ownership", () => {
      const store = makeStore();
      store.getState().setSeidelData(mockSeidelData, model);
      expect(store.getState().seidelDataModel).toBe(model);
      const nextModel = { ...model };
      const nextData = { ...mockSeidelData, transverse: { TSA: 10 } };
      const observer = jest.fn();
      store.subscribe(observer);
      store.getState().setSeidelData(nextData, nextModel);
      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer.mock.calls[0][0].seidelData).toBe(nextData);
      expect(observer.mock.calls[0][0].seidelDataModel).toBe(nextModel);
    });

    it.each(["omitted source", "cleared data"])(
      "clears ownership with %s",
      (condition) => {
        const store = makeStore();
        store.getState().setSeidelData(mockSeidelData, model);
        if (condition === "omitted source")
          store.getState().setSeidelData(mockSeidelData);
        else store.getState().setSeidelData(undefined, model);
        expect(store.getState().seidelDataModel).toBeUndefined();
      },
    );

    it("stores seidel data", () => {
      const store = makeStore();
      store.getState().setSeidelData(mockSeidelData);
      expect(store.getState().seidelData).toEqual(mockSeidelData);
    });

    it("clears seidel data with undefined", () => {
      const store = makeStore();
      store.getState().setSeidelData(mockSeidelData);
      store.getState().setSeidelData(undefined);
      expect(store.getState().seidelData).toBeUndefined();
    });
  });

  describe("setFirstOrderData", () => {
    it("publishes the payload and exact source together, replacing previous ownership", () => {
      const store = makeStore();
      store.getState().setFirstOrderData({ efl: 100 }, model);
      expect(store.getState().firstOrderDataModel).toBe(model);
      const nextModel = { ...model };
      const nextData = { efl: 200 };
      const observer = jest.fn();
      store.subscribe(observer);
      store.getState().setFirstOrderData(nextData, nextModel);
      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer.mock.calls[0][0].firstOrderData).toBe(nextData);
      expect(observer.mock.calls[0][0].firstOrderDataModel).toBe(nextModel);
    });

    it.each(["omitted source", "cleared data"])(
      "clears ownership with %s",
      (condition) => {
        const store = makeStore();
        store.getState().setFirstOrderData({ efl: 100 }, model);
        if (condition === "omitted source")
          store.getState().setFirstOrderData({ efl: 200 });
        else store.getState().setFirstOrderData(undefined, model);
        expect(store.getState().firstOrderDataModel).toBeUndefined();
      },
    );

    it("stores first order data", () => {
      const store = makeStore();
      store.getState().setFirstOrderData({ efl: 100, fno: 4 });
      expect(store.getState().firstOrderData).toEqual({ efl: 100, fno: 4 });
    });

    it("clears first order data with undefined", () => {
      const store = makeStore();
      store.getState().setFirstOrderData({ efl: 100 });
      store.getState().setFirstOrderData(undefined);
      expect(store.getState().firstOrderData).toBeUndefined();
    });
  });
});
