import { createStore } from "zustand/vanilla";
import {
  createAnalysisPlotSlice,
  type AnalysisPlotState,
} from "@/store/analysisPlotStore";
import type { PlotType } from "@/components/composite/AnalysisPlotView";

function makeStore() {
  return createStore<AnalysisPlotState>(createAnalysisPlotSlice);
}

describe("analysisPlotStore", () => {
  describe("initial state", () => {
    it("has plotImage as undefined", () => {
      const store = makeStore();
      expect(store.getState().plotImage).toBeUndefined();
    });

    it("has plotLoading as false", () => {
      const store = makeStore();
      expect(store.getState().plotLoading).toBe(false);
    });

    it("has selectedFieldIndex as 0", () => {
      const store = makeStore();
      expect(store.getState().selectedFieldIndex).toBe(0);
    });

    it("has selectedWavelengthIndex as 0", () => {
      const store = makeStore();
      expect(store.getState().selectedWavelengthIndex).toBe(0);
    });

    it("has selectedPlotType as rayFan", () => {
      const store = makeStore();
      expect(store.getState().selectedPlotType).toBe("rayFan");
    });
  });

  describe("setPlotImage", () => {
    it("sets plotImage to a string", () => {
      const store = makeStore();
      store.getState().setPlotImage("base64data");
      expect(store.getState().plotImage).toBe("base64data");
    });

    it("clears plotImage with undefined", () => {
      const store = makeStore();
      store.getState().setPlotImage("base64data");
      store.getState().setPlotImage(undefined);
      expect(store.getState().plotImage).toBeUndefined();
    });
  });

  describe("setPlotLoading", () => {
    it("sets plotLoading to true", () => {
      const store = makeStore();
      store.getState().setPlotLoading(true);
      expect(store.getState().plotLoading).toBe(true);
    });

    it("sets plotLoading back to false", () => {
      const store = makeStore();
      store.getState().setPlotLoading(true);
      store.getState().setPlotLoading(false);
      expect(store.getState().plotLoading).toBe(false);
    });
  });

  describe("setSelectedFieldIndex", () => {
    it("sets selectedFieldIndex to 2", () => {
      const store = makeStore();
      store.getState().setSelectedFieldIndex(2);
      expect(store.getState().selectedFieldIndex).toBe(2);
    });

    it("resets selectedFieldIndex to 0", () => {
      const store = makeStore();
      store.getState().setSelectedFieldIndex(2);
      store.getState().setSelectedFieldIndex(0);
      expect(store.getState().selectedFieldIndex).toBe(0);
    });
  });

  describe("setSelectedWavelengthIndex", () => {
    it("sets selectedWavelengthIndex to 1", () => {
      const store = makeStore();
      store.getState().setSelectedWavelengthIndex(1);
      expect(store.getState().selectedWavelengthIndex).toBe(1);
    });

    it("resets selectedWavelengthIndex to 0", () => {
      const store = makeStore();
      store.getState().setSelectedWavelengthIndex(1);
      store.getState().setSelectedWavelengthIndex(0);
      expect(store.getState().selectedWavelengthIndex).toBe(0);
    });
  });

  describe("setSelectedPlotType", () => {
    it("sets selectedPlotType to spotDiagram", () => {
      const store = makeStore();
      store.getState().setSelectedPlotType("spotDiagram");
      expect(store.getState().selectedPlotType).toBe("spotDiagram");
    });

    it("resets selectedPlotType to rayFan", () => {
      const store = makeStore();
      store.getState().setSelectedPlotType("spotDiagram");
      store.getState().setSelectedPlotType("rayFan");
      expect(store.getState().selectedPlotType).toBe("rayFan");
    });

    it("accepts all 7 valid PlotType values", () => {
      const store = makeStore();
      const allTypes: PlotType[] = [
        "rayFan",
        "opdFan",
        "spotDiagram",
        "surfaceBySurface3rdOrder",
        "wavefrontMap",
        "geoPSF",
        "diffractionPSF",
      ];
      for (const t of allTypes) {
        store.getState().setSelectedPlotType(t);
        expect(store.getState().selectedPlotType).toBe(t);
      }
    });
  });
});
