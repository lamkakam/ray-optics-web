import type { PlotType } from "@/features/analysis/components/AnalysisPlotView";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { buildPlotFn, PLOT_FUNCTION_BUILDERS } from "@/shared/lib/utils/plotFunctions";

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
    plotOpdFan: jest.fn().mockResolvedValue("opdFan-result"),
    plotSpotDiagram: jest.fn().mockResolvedValue("spotDiagram-result"),
    plotSurfaceBySurface3rdOrderAberr: jest.fn().mockResolvedValue("s3rdOrder-result"),
    plotWavefrontMap: jest.fn().mockResolvedValue("wavefront-result"),
    getWavefrontData: jest.fn(),
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

  it("rayFan calls proxy.plotRayFan with model and fieldIndex", async () => {
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
