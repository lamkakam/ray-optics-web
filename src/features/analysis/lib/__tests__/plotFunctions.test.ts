import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { OpdFanData, RayFanData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { loadAnalysisPlot } from "@/features/analysis/lib/plotFunctions";

const mockModel = {} as OpticalModel;

function makeMockProxy(): jest.Mocked<PyodideWorkerAPI> {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    getLensLayoutData: jest.fn(),
    createModel: jest.fn(),
    getSequentialModelData: jest.fn(),
    updateSurface: jest.fn(),
    updateSpecs: jest.fn(),
    getAnalysisData: jest.fn(),
    importLensFile: jest.fn(),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue({
      surfaceBySurface: {
        aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
        surfaceLabels: ["S1", "sum"],
        data: [
          [0.1, 0.3],
          [0.2, 0.4],
          [0.3, 0.5],
          [0.4, 0.6],
          [0.5, 0.7],
        ],
      },
      transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
      wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
      curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
    } satisfies SeidelData),
    getZernikeCoefficients: jest.fn(),
    plotRayFan: jest.fn().mockResolvedValue("rayFan-result"),
    getRayFanData: jest.fn().mockResolvedValue([
      {
        fieldIdx: 0,
        wvlIdx: 1,
        Sagittal: {
          x: [-1, 0, 1],
          y: [0.2, 0, -0.2],
        },
        Tangential: {
          x: [-1, 0, 1],
          y: [0.1, 0, -0.1],
        },
        unitX: "",
        unitY: "mm",
      },
    ] satisfies RayFanData),
    plotOpdFan: jest.fn().mockResolvedValue("opdFan-result"),
    getOpdFanData: jest.fn().mockResolvedValue([
      {
        fieldIdx: 0,
        wvlIdx: 1,
        Sagittal: {
          x: [-1, 0, 1],
          y: [0.2, 0, -0.2],
        },
        Tangential: {
          x: [-1, 0, 1],
          y: [0.1, 0, -0.1],
        },
        unitX: "",
        unitY: "waves",
      },
    ] satisfies OpdFanData),
    plotSpotDiagram: jest.fn().mockResolvedValue("spotDiagram-result"),
    getSpotDiagramData: jest.fn().mockResolvedValue([
      {
        fieldIdx: 0,
        wvlIdx: 1,
        x: [-0.01, 0.01],
        y: [-0.02, 0.02],
        unitX: "mm",
        unitY: "mm",
      },
    ]),
    plotSurfaceBySurface3rdOrderAberr: jest.fn().mockResolvedValue("s3rdOrder-result"),
    plotWavefrontMap: jest.fn().mockResolvedValue("wavefront-result"),
    getWavefrontData: jest.fn(),
    getGeoPSFData: jest.fn().mockResolvedValue({
      fieldIdx: 0,
      wvlIdx: 1,
      x: [-0.01, 0.01],
      y: [-0.02, 0.02],
      unitX: "mm",
      unitY: "mm",
    }),
    plotGeoPSF: jest.fn().mockResolvedValue("geoPSF-result"),
    plotDiffractionPSF: jest.fn().mockResolvedValue("diffractionPSF-result"),
    getDiffractionPSFData: jest.fn(),
  } as unknown as jest.Mocked<PyodideWorkerAPI>;
}

describe("loadAnalysisPlot", () => {
  it("returns undefined when proxy is undefined", async () => {
    await expect(loadAnalysisPlot({
      plotType: "rayFan",
      proxy: undefined,
      model: mockModel,
      fieldIndex: 0,
      wavelengthIndex: 0,
    })).resolves.toBeUndefined();
  });

  it("loads wavefrontMap through getWavefrontData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "wavefrontMap",
      proxy,
      model: mockModel,
      fieldIndex: 1,
      wavelengthIndex: 2,
    });

    expect(proxy.getWavefrontData).toHaveBeenCalledWith(mockModel, 1, 2);
    expect(proxy.plotWavefrontMap).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "wavefrontMap",
      wavefrontMapData: undefined,
    });
  });

  it("loads rayFan through getRayFanData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "rayFan",
      proxy,
      model: mockModel,
      fieldIndex: 1,
      wavelengthIndex: 2,
    });

    expect(proxy.getRayFanData).toHaveBeenCalledWith(mockModel, 1);
    expect(proxy.plotRayFan).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "rayFan",
      rayFanData: [
        {
          fieldIdx: 0,
          wvlIdx: 1,
          Sagittal: {
            x: [-1, 0, 1],
            y: [0.2, 0, -0.2],
          },
          Tangential: {
            x: [-1, 0, 1],
            y: [0.1, 0, -0.1],
          },
          unitX: "",
          unitY: "mm",
        },
      ],
    });
  });

  it("loads opdFan through getOpdFanData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "opdFan",
      proxy,
      model: mockModel,
      fieldIndex: 1,
      wavelengthIndex: 2,
    });

    expect(proxy.getOpdFanData).toHaveBeenCalledWith(mockModel, 1);
    expect(proxy.plotOpdFan).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "opdFan",
      opdFanData: [
        {
          fieldIdx: 0,
          wvlIdx: 1,
          Sagittal: {
            x: [-1, 0, 1],
            y: [0.2, 0, -0.2],
          },
          Tangential: {
            x: [-1, 0, 1],
            y: [0.1, 0, -0.1],
          },
          unitX: "",
          unitY: "waves",
        },
      ],
    });
  });

  it("loads diffractionPSF through getDiffractionPSFData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "diffractionPSF",
      proxy,
      model: mockModel,
      fieldIndex: 2,
      wavelengthIndex: 1,
    });

    expect(proxy.getDiffractionPSFData).toHaveBeenCalledWith(mockModel, 2, 1);
    expect(proxy.plotDiffractionPSF).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "diffractionPSF",
      diffractionPsfData: undefined,
    });
  });

  it("loads geoPSF through getGeoPSFData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "geoPSF",
      proxy,
      model: mockModel,
      fieldIndex: 0,
      wavelengthIndex: 1,
    });

    expect(proxy.getGeoPSFData).toHaveBeenCalledWith(mockModel, 0, 1);
    expect(proxy.plotGeoPSF).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "geoPSF",
      geoPsfData: {
        fieldIdx: 0,
        wvlIdx: 1,
        x: [-0.01, 0.01],
        y: [-0.02, 0.02],
        unitX: "mm",
        unitY: "mm",
      },
    });
  });

  it("loads spotDiagram through getSpotDiagramData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "spotDiagram",
      proxy,
      model: mockModel,
      fieldIndex: 0,
      wavelengthIndex: 1,
    });

    expect(proxy.getSpotDiagramData).toHaveBeenCalledWith(mockModel, 0);
    expect(proxy.plotSpotDiagram).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "spotDiagram",
      spotDiagramData: [
        {
          fieldIdx: 0,
          wvlIdx: 1,
          x: [-0.01, 0.01],
          y: [-0.02, 0.02],
          unitX: "mm",
          unitY: "mm",
        },
      ],
    });
  });

  it("loads surfaceBySurface3rdOrder through get3rdOrderSeidelData instead of the PNG path", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "surfaceBySurface3rdOrder",
      proxy,
      model: mockModel,
      fieldIndex: 0,
      wavelengthIndex: 0,
    });

    expect(proxy.get3rdOrderSeidelData).toHaveBeenCalledWith(mockModel);
    expect(proxy.plotSurfaceBySurface3rdOrderAberr).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "surfaceBySurface3rdOrder",
      surfaceBySurface3rdOrderData: {
        aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
        surfaceLabels: ["S1", "sum"],
        data: [
          [0.1, 0.3],
          [0.2, 0.4],
          [0.3, 0.5],
          [0.4, 0.6],
          [0.5, 0.7],
        ],
      },
    });
  });
});
