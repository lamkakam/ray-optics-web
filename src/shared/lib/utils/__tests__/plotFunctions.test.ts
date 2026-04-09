import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";
import type { OpdFanData, OpticalModel, RayFanData } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { buildPlotFn, loadAnalysisPlot, PLOT_FUNCTION_BUILDERS } from "@/shared/lib/utils/plotFunctions";

const ALL_PLOT_TYPES: PlotType[] = [
  "rayFan",
  "opdFan",
  "spotDiagram",
  "surfaceBySurface3rdOrder",
  "wavefrontMap",
  "geoPSF",
  "diffractionPSF",
];

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
    get3rdOrderSeidelData: jest.fn(),
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

describe("buildPlotFn", () => {
  it("returns undefined when proxy is undefined", () => {
    expect(buildPlotFn("rayFan", undefined, mockModel)).toBeUndefined();
  });

  it("returns undefined when model is undefined", () => {
    const proxy = makeMockProxy();
    expect(buildPlotFn("rayFan", proxy, undefined)).toBeUndefined();
  });

  it("returns a function for each of the 7 PlotTypes when proxy and model are provided", () => {
    const proxy = makeMockProxy();
    for (const plotType of ALL_PLOT_TYPES) {
      expect(buildPlotFn(plotType, proxy, mockModel)).toBeInstanceOf(Function);
    }
  });

  it("rayFan builder still calls proxy.plotRayFan with model and fieldIndex", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("rayFan", proxy, mockModel)!;
    await fn(1, 0);
    expect(proxy.plotRayFan).toHaveBeenCalledWith(mockModel, 1);
  });

  it("opdFan calls proxy.plotOpdFan with model and fieldIndex", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("opdFan", proxy, mockModel)!;
    await fn(2, 0);
    expect(proxy.plotOpdFan).toHaveBeenCalledWith(mockModel, 2);
  });

  it("spotDiagram calls proxy.plotSpotDiagram with model and fieldIndex", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("spotDiagram", proxy, mockModel)!;
    await fn(0, 1);
    expect(proxy.plotSpotDiagram).toHaveBeenCalledWith(mockModel, 0);
  });

  it("surfaceBySurface3rdOrder calls proxy.plotSurfaceBySurface3rdOrderAberr with model only", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("surfaceBySurface3rdOrder", proxy, mockModel)!;
    await fn(1, 2);
    expect(proxy.plotSurfaceBySurface3rdOrderAberr).toHaveBeenCalledWith(mockModel);
  });

  it("wavefrontMap calls proxy.plotWavefrontMap with model, fieldIndex, and wavelengthIndex", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("wavefrontMap", proxy, mockModel)!;
    await expect(fn(1, 2)).rejects.toThrow("wavefrontMap should be loaded through getWavefrontData");
    expect(proxy.plotWavefrontMap).not.toHaveBeenCalled();
  });

  it("geoPSF calls proxy.plotGeoPSF with model, fieldIndex, and wavelengthIndex", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("geoPSF", proxy, mockModel)!;
    await fn(0, 1);
    expect(proxy.plotGeoPSF).toHaveBeenCalledWith(mockModel, 0, 1);
  });

  it("diffractionPSF calls proxy.plotDiffractionPSF with model, fieldIndex, and wavelengthIndex", async () => {
    const proxy = makeMockProxy();
    const fn = buildPlotFn("diffractionPSF", proxy, mockModel)!;
    await fn(2, 1);
    expect(proxy.plotDiffractionPSF).toHaveBeenCalledWith(mockModel, 2, 1);
  });
});

describe("PLOT_FUNCTION_BUILDERS", () => {
  it("has an entry for every PlotType", () => {
    for (const plotType of ALL_PLOT_TYPES) {
      expect(PLOT_FUNCTION_BUILDERS[plotType]).toBeInstanceOf(Function);
    }
  });
});

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
});
