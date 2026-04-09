import { createStore } from "zustand/vanilla";
import {
  createAnalysisPlotSlice,
  type AnalysisPlotState,
} from "@/features/analysis/stores/analysisPlotStore";
import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";

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

    it("has diffractionPsfData as undefined", () => {
      const store = makeStore();
      expect(store.getState().diffractionPsfData).toBeUndefined();
    });

    it("has geoPsfData as undefined", () => {
      const store = makeStore();
      expect(store.getState().geoPsfData).toBeUndefined();
    });

    it("has wavefrontMapData as undefined", () => {
      const store = makeStore();
      expect(store.getState().wavefrontMapData).toBeUndefined();
    });

    it("has spotDiagramData as undefined", () => {
      const store = makeStore();
      expect(store.getState().spotDiagramData).toBeUndefined();
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

    it("clears chart payloads when setting plotImage", () => {
      const store = makeStore();
      store.getState().setDiffractionPsfData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[1]],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });
      store.getState().setWavefrontMapData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[undefined]],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      store.getState().setPlotImage("base64data");

      expect(store.getState().plotImage).toBe("base64data");
      expect(store.getState().geoPsfData).toBeUndefined();
      expect(store.getState().diffractionPsfData).toBeUndefined();
      expect(store.getState().wavefrontMapData).toBeUndefined();
      expect(store.getState().spotDiagramData).toBeUndefined();
    });
  });

  describe("setSpotDiagramData", () => {
    it("sets spotDiagramData", () => {
      const store = makeStore();
      store.getState().setSpotDiagramData([
        {
          fieldIdx: 1,
          wvlIdx: 0,
          x: [-0.02, 0, 0.02],
          y: [-0.01, 0, 0.01],
          unitX: "mm",
          unitY: "mm",
        },
      ]);

      expect(store.getState().spotDiagramData).toEqual([
        expect.objectContaining({
          fieldIdx: 1,
          wvlIdx: 0,
        }),
      ]);
    });

    it("clears plot image and all other chart payloads when setting spot diagram data", () => {
      const store = makeStore();
      store.getState().setPlotImage("base64data");
      store.getState().setGeoPsfData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        unitX: "mm",
        unitY: "mm",
      });
      store.getState().setDiffractionPsfData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[1]],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });
      store.getState().setWavefrontMapData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[undefined]],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      store.getState().setSpotDiagramData([
        {
          fieldIdx: 1,
          wvlIdx: 2,
          x: [-0.02, 0, 0.02],
          y: [-0.01, 0, 0.01],
          unitX: "mm",
          unitY: "mm",
        },
      ]);

      expect(store.getState().plotImage).toBeUndefined();
      expect(store.getState().geoPsfData).toBeUndefined();
      expect(store.getState().diffractionPsfData).toBeUndefined();
      expect(store.getState().wavefrontMapData).toBeUndefined();
      expect(store.getState().spotDiagramData).toBeDefined();
    });
  });

  describe("setGeoPsfData", () => {
    it("sets geoPsfData", () => {
      const store = makeStore();
      store.getState().setGeoPsfData({
        fieldIdx: 1,
        wvlIdx: 2,
        x: [-0.02, 0, 0.02],
        y: [-0.01, 0, 0.01],
        unitX: "mm",
        unitY: "mm",
      });

      expect(store.getState().geoPsfData).toBeDefined();
      expect(store.getState().geoPsfData?.fieldIdx).toBe(1);
    });

    it("clears plot image, diffraction data, and wavefront data when setting geo PSF data", () => {
      const store = makeStore();
      store.getState().setPlotImage("base64data");
      store.getState().setDiffractionPsfData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[1]],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });
      store.getState().setWavefrontMapData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[undefined]],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      store.getState().setGeoPsfData({
        fieldIdx: 1,
        wvlIdx: 2,
        x: [-0.02, 0, 0.02],
        y: [-0.01, 0, 0.01],
        unitX: "mm",
        unitY: "mm",
      });

      expect(store.getState().plotImage).toBeUndefined();
      expect(store.getState().diffractionPsfData).toBeUndefined();
      expect(store.getState().wavefrontMapData).toBeUndefined();
      expect(store.getState().geoPsfData?.fieldIdx).toBe(1);
    });
  });

  describe("setDiffractionPsfData", () => {
    it("sets diffractionPsfData", () => {
      const store = makeStore();
      store.getState().setDiffractionPsfData({
        fieldIdx: 1,
        wvlIdx: 2,
        x: [-0.02, 0, 0.02],
        y: [-0.02, 0, 0.02],
        z: [
          [0.001, 0.01, 0.001],
          [0.01, 1, 0.01],
          [0.001, 0.01, 0.001],
        ],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });
      expect(store.getState().diffractionPsfData).toBeDefined();
      expect(store.getState().diffractionPsfData?.fieldIdx).toBe(1);
    });

    it("clears diffractionPsfData with undefined", () => {
      const store = makeStore();
      store.getState().setDiffractionPsfData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[1]],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });
      store.getState().setDiffractionPsfData(undefined);
      expect(store.getState().diffractionPsfData).toBeUndefined();
    });

    it("clears plot image and wavefront data when setting diffraction data", () => {
      const store = makeStore();
      store.getState().setPlotImage("base64data");
      store.getState().setWavefrontMapData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[0]],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      store.getState().setDiffractionPsfData({
        fieldIdx: 1,
        wvlIdx: 2,
        x: [-0.02, 0, 0.02],
        y: [-0.02, 0, 0.02],
        z: [
          [0.001, 0.01, 0.001],
          [0.01, 1, 0.01],
          [0.001, 0.01, 0.001],
        ],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });

      expect(store.getState().plotImage).toBeUndefined();
      expect(store.getState().wavefrontMapData).toBeUndefined();
      expect(store.getState().diffractionPsfData?.fieldIdx).toBe(1);
    });
  });

  describe("setWavefrontMapData", () => {
    it("sets wavefrontMapData", () => {
      const store = makeStore();
      store.getState().setWavefrontMapData({
        fieldIdx: 1,
        wvlIdx: 2,
        x: [-1, 0, 1],
        y: [-1, 0, 1],
        z: [
          [undefined, 0.1, undefined],
          [0.2, 0.3, 0.4],
          [undefined, 0.5, undefined],
        ],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      expect(store.getState().wavefrontMapData).toBeDefined();
      expect(store.getState().wavefrontMapData?.fieldIdx).toBe(1);
    });

    it("clears wavefrontMapData with undefined", () => {
      const store = makeStore();
      store.getState().setWavefrontMapData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[0]],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      store.getState().setWavefrontMapData(undefined);

      expect(store.getState().wavefrontMapData).toBeUndefined();
    });

    it("clears plot image and diffraction data when setting wavefront data", () => {
      const store = makeStore();
      store.getState().setPlotImage("base64data");
      store.getState().setDiffractionPsfData({
        fieldIdx: 0,
        wvlIdx: 0,
        x: [0],
        y: [0],
        z: [[1]],
        unitX: "mm",
        unitY: "mm",
        unitZ: "",
      });

      store.getState().setWavefrontMapData({
        fieldIdx: 1,
        wvlIdx: 2,
        x: [-1, 0, 1],
        y: [-1, 0, 1],
        z: [
          [undefined, 0.1, undefined],
          [0.2, 0.3, 0.4],
          [undefined, 0.5, undefined],
        ],
        unitX: "",
        unitY: "",
        unitZ: "waves",
      });

      expect(store.getState().plotImage).toBeUndefined();
      expect(store.getState().diffractionPsfData).toBeUndefined();
      expect(store.getState().wavefrontMapData?.fieldIdx).toBe(1);
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

    it("sets index as-is when maxCount is omitted", () => {
      const store = makeStore();
      store.getState().setSelectedFieldIndex(10);
      expect(store.getState().selectedFieldIndex).toBe(10);
    });

    it("sets index unchanged when maxCount is provided and index < maxCount", () => {
      const store = makeStore();
      store.getState().setSelectedFieldIndex(1, 3);
      expect(store.getState().selectedFieldIndex).toBe(1);
    });

    it("clamps to maxCount - 1 when index >= maxCount", () => {
      const store = makeStore();
      store.getState().setSelectedFieldIndex(5, 3);
      expect(store.getState().selectedFieldIndex).toBe(2);
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

    it("sets index as-is when maxCount is omitted", () => {
      const store = makeStore();
      store.getState().setSelectedWavelengthIndex(10);
      expect(store.getState().selectedWavelengthIndex).toBe(10);
    });

    it("sets index unchanged when maxCount is provided and index < maxCount", () => {
      const store = makeStore();
      store.getState().setSelectedWavelengthIndex(2, 3);
      expect(store.getState().selectedWavelengthIndex).toBe(2);
    });

    it("clamps to maxCount - 1 when index >= maxCount", () => {
      const store = makeStore();
      store.getState().setSelectedWavelengthIndex(5, 3);
      expect(store.getState().selectedWavelengthIndex).toBe(2);
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
