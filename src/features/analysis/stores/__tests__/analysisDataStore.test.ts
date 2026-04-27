import { createStore } from "zustand/vanilla";
import {
  createAnalysisDataSlice,
  type AnalysisDataState,
} from "@/features/analysis/stores/analysisDataStore";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";

const mockSeidelData: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II"],
    surfaceLabels: ["S1", "sum"],
    data: [[0.1, 0.2], [0.3, 0.4]],
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
    });

    it("firstOrderData is undefined by default", () => {
      const store = makeStore();
      expect(store.getState().firstOrderData).toBeUndefined();
    });
  });

  describe("setSeidelData", () => {
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
