/** Covers typed plot dispatch, resolution-specific caching, and MTF transforms at twice the pupil sampling. */
import { DEFAULT_ANALYSIS_RAY_COUNTS } from "@/features/analysis/lib/analysisRayCounts";
import { createStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type {
  AstigmatismCurveData,
  DiffractionMtfData,
  FieldCurveData,
  LongitudinalSphericalAberrationData,
  OpdFanData,
  RayFanData,
  StrehlVsWavelengthData,
} from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  commitAnalysisPlotResult,
  loadAnalysisPlot,
} from "@/features/analysis/lib/plotFunctions";
import {
  createAnalysisPlotSlice,
  type AnalysisPlotState,
} from "@/features/analysis/stores/analysisPlotStore";
import { _resetAnalysisCache } from "@/features/analysis/lib/analysisCache";

const mockModel = {} as OpticalModel;

const diffractionMtfData: DiffractionMtfData = {
  fieldIdx: 0,
  wvlIdx: 0,
  Tangential: { x: [0, 10, 20], y: [1, 0.7, 0.2] },
  Sagittal: { x: [0, 10, 20], y: [1, 0.65, 0.15] },
  IdealTangential: { x: [0, 10, 20], y: [1, 0.8, 0.3] },
  IdealSagittal: { x: [0, 10, 20], y: [1, 0.78, 0.28] },
  unitX: "cycles/mm",
  unitY: "",
  cutoffTangential: 42,
  cutoffSagittal: 40,
  scaleKind: "image-na",
  naTangential: 0.012,
  naSagittal: 0.011,
};

const strehlVsWavelengthData: StrehlVsWavelengthData = {
  fieldIdx: 1,
  x: [486.1, 587.6, 656.3],
  y: [0.72, 0.94, 0.81],
  unitX: "nm",
  unitY: "",
};

const fieldCurveData: FieldCurveData = {
  wvlIdx: 2,
  Sagittal: { x: [-0.1, 0, 0.1], y: [0, 1, 2] },
  Tangential: { x: [-0.2, 0, 0.2], y: [0, 1, 2] },
  fieldLabels: ["0", "10", "20"],
  unitX: "mm",
  unitY: "deg",
};

const astigmatismCurveData: AstigmatismCurveData = {
  wvlIdx: 2,
  Astigmatism: { x: [-0.1, 0, 0.1], y: [0, 1, 2] },
  fieldLabels: ["0", "10", "20"],
  unitX: "mm",
  unitY: "deg",
};

const longitudinalSphericalAberrationData: LongitudinalSphericalAberrationData =
  [
    {
      wvlIdx: 0,
      LSA: { x: [0, -0.02, -0.08], y: [0, 0.5, 1] },
      unitX: "mm",
      unitY: "",
    },
  ];

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
      transverse: {
        TSA: 0.1,
        TCO: 0.2,
        TAS: 0.3,
        SAS: 0.4,
        PTB: 0.5,
        DST: 0.6,
      },
      wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
      curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
    } satisfies SeidelData),
    getZernikeCoefficients: jest.fn(),
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
    getFieldCurvatureData: jest.fn().mockResolvedValue(fieldCurveData),
    getAstigmatismCurveData: jest.fn().mockResolvedValue(astigmatismCurveData),
    getLSAData: jest
      .fn()
      .mockResolvedValue(longitudinalSphericalAberrationData),
    getWavefrontData: jest.fn(),
    getGeoPSFData: jest.fn().mockResolvedValue({
      fieldIdx: 0,
      wvlIdx: 1,
      x: [-0.01, 0.01],
      y: [-0.02, 0.02],
      unitX: "mm",
      unitY: "mm",
    }),
    getDiffractionPSFData: jest.fn(),
    getDiffractionMTFData: jest.fn(),
    getStrehlVsWavelengthData: jest
      .fn()
      .mockResolvedValue(strehlVsWavelengthData),
  } as unknown as jest.Mocked<PyodideWorkerAPI>;
}

describe("loadAnalysisPlot", () => {
  beforeEach(() => _resetAnalysisCache());
  it("returns undefined when proxy is undefined", async () => {
    await expect(
      loadAnalysisPlot({
        plotType: "rayFan",
        proxy: undefined,
        model: mockModel,
        fieldIndex: 0,
        wavelengthIndex: 0,
      }),
    ).resolves.toBeUndefined();
  });

  it("loads wavefrontMap through getWavefrontData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "wavefrontMap",
      proxy,
      model: mockModel,
      fieldIndex: 1,
      wavelengthIndex: 2,
      imagePoint: "centroid",
    });

    expect(proxy.getWavefrontData).toHaveBeenCalledWith(
      mockModel,
      1,
      2,
      "centroid",
      128,
    );
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
      imagePoint: "centroid",
    });

    expect(proxy.getRayFanData).toHaveBeenCalledWith(
      mockModel,
      1,
      "centroid",
      21,
    );
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
      imagePoint: "centroid",
    });

    expect(proxy.getOpdFanData).toHaveBeenCalledWith(
      mockModel,
      1,
      "centroid",
      21,
    );
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
      imagePoint: "centroid",
    });

    expect(proxy.getDiffractionPSFData).toHaveBeenCalledWith(
      mockModel,
      2,
      1,
      "centroid",
      128,
      1024,
    );
    expect(result).toEqual({
      kind: "diffractionPSF",
      diffractionPsfData: undefined,
    });
  });

  it("loads diffractionMTF through getDiffractionMTFData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "diffractionMTF",
      proxy,
      model: mockModel,
      fieldIndex: 2,
      wavelengthIndex: 1,
      imagePoint: "centroid",
    });

    expect(proxy.getDiffractionMTFData).toHaveBeenCalledWith(
      mockModel,
      2,
      1,
      "centroid",
      128,
      256,
    );
    expect(result).toEqual({
      kind: "diffractionMTF",
      diffractionMtfData: undefined,
    });
  });

  it("loads strehlVsWavelength through getStrehlVsWavelengthData", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "strehlVsWavelength",
      proxy,
      model: mockModel,
      fieldIndex: 1,
      wavelengthIndex: 2,
      imagePoint: "centroid",
    });

    expect(proxy.getStrehlVsWavelengthData).toHaveBeenCalledWith(
      mockModel,
      1,
      "centroid",
      100,
      21,
    );
    expect(result).toEqual({
      kind: "strehlVsWavelength",
      strehlVsWavelengthData,
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

    expect(proxy.getGeoPSFData).toHaveBeenCalledWith(mockModel, 0, 1, 128);
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
      imagePoint: "centroid",
    });

    expect(proxy.getSpotDiagramData).toHaveBeenCalledWith(
      mockModel,
      0,
      "centroid",
      21,
    );
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

  it("loads fieldCurvature through getFieldCurvatureData with only the wavelength index", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "fieldCurvature",
      proxy,
      model: mockModel,
      fieldIndex: 99,
      wavelengthIndex: 2,
    });

    expect(proxy.getFieldCurvatureData).toHaveBeenCalledWith(mockModel, 2);
    expect(result).toEqual({
      kind: "fieldCurvature",
      fieldCurvatureData: fieldCurveData,
    });
  });

  it("loads astigmatismCurve through getAstigmatismCurveData with only the wavelength index", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "astigmatismCurve",
      proxy,
      model: mockModel,
      fieldIndex: 99,
      wavelengthIndex: 1,
    });

    expect(proxy.getAstigmatismCurveData).toHaveBeenCalledWith(mockModel, 1);
    expect(result).toEqual({
      kind: "astigmatismCurve",
      astigmatismCurveData,
    });
  });

  it("loads longitudinalSphericalAberration through getLSAData without field or wavelength indices", async () => {
    const proxy = makeMockProxy();
    const result = await loadAnalysisPlot({
      plotType: "longitudinalSphericalAberration",
      proxy,
      model: mockModel,
      fieldIndex: 99,
      wavelengthIndex: 88,
    });

    expect(proxy.getLSAData).toHaveBeenCalledWith(mockModel);
    expect(result).toEqual({
      kind: "longitudinalSphericalAberration",
      longitudinalSphericalAberrationData,
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

describe("commitAnalysisPlotResult", () => {
  it("commits diffractionMTF data into the analysis plot store", () => {
    const store = createStore<AnalysisPlotState>(createAnalysisPlotSlice);

    commitAnalysisPlotResult(
      {
        kind: "diffractionMTF",
        diffractionMtfData,
      },
      store,
    );

    expect(store.getState().diffractionMtfData).toEqual(diffractionMtfData);
  });

  it("commits strehlVsWavelength data into the analysis plot store", () => {
    const store = createStore<AnalysisPlotState>(createAnalysisPlotSlice);

    commitAnalysisPlotResult(
      {
        kind: "strehlVsWavelength",
        strehlVsWavelengthData,
      },
      store,
    );

    expect(store.getState().strehlVsWavelengthData).toEqual(
      strehlVsWavelengthData,
    );
  });

  it("commits fieldCurvature data into the analysis plot store", () => {
    const store = createStore<AnalysisPlotState>(createAnalysisPlotSlice);

    commitAnalysisPlotResult(
      {
        kind: "fieldCurvature",
        fieldCurvatureData: fieldCurveData,
      },
      store,
    );

    expect(store.getState().fieldCurvatureData).toEqual(fieldCurveData);
  });

  it("commits astigmatismCurve data into the analysis plot store", () => {
    const store = createStore<AnalysisPlotState>(createAnalysisPlotSlice);

    commitAnalysisPlotResult(
      {
        kind: "astigmatismCurve",
        astigmatismCurveData,
      },
      store,
    );

    expect(store.getState().astigmatismCurveData).toEqual(astigmatismCurveData);
  });

  it("does not commit surfaceBySurface3rdOrder data into the analysis plot store", () => {
    const store = createStore<AnalysisPlotState>(createAnalysisPlotSlice);
    store.getState().setDiffractionMtfData(diffractionMtfData);

    commitAnalysisPlotResult(
      {
        kind: "surfaceBySurface3rdOrder",
        surfaceBySurface3rdOrderData: {
          aberrTypes: ["S-I"],
          surfaceLabels: ["S1"],
          data: [[0.1]],
        },
      },
      store,
    );

    expect(store.getState().diffractionMtfData).toEqual(diffractionMtfData);
  });
});

/** All configurable plots pass effective counts and separate cached resolutions. */
describe("configurable plot sampling", () => {
  beforeEach(() => _resetAnalysisCache());
  const cases = [
    ["rayFan", "getRayFanData", 21, [1, "centroid"]],
    ["opdFan", "getOpdFanData", 21, [1, "centroid"]],
    ["spotDiagram", "getSpotDiagramData", 21, [1, "centroid"]],
    [
      "strehlVsWavelength",
      "getStrehlVsWavelengthData",
      21,
      [1, "centroid", 100],
    ],
    ["wavefrontMap", "getWavefrontData", 128, [1, 2, "centroid"]],
    ["geoPSF", "getGeoPSFData", 128, [1, 2]],
    ["diffractionPSF", "getDiffractionPSFData", 128, [1, 2, "centroid"]],
    ["diffractionMTF", "getDiffractionMTFData", 128, [1, 2, "centroid"]],
  ] as const;

  it.each(cases)(
    "passes default and explicit counts and reuses %s cache",
    async (plotType, method, defaultCount, prefix) => {
      const proxy = makeMockProxy();
      const params = {
        plotType,
        proxy,
        model: mockModel,
        fieldIndex: 1,
        wavelengthIndex: 2,
        imagePoint: "centroid" as const,
      };
      const dims =
        plotType === "diffractionPSF"
          ? [1024]
          : plotType === "diffractionMTF"
            ? [256]
            : [];
      const first = await loadAnalysisPlot(params);
      expect(proxy[method]).toHaveBeenLastCalledWith(
        mockModel,
        ...prefix,
        defaultCount,
        ...dims,
      );
      await loadAnalysisPlot({
        ...params,
        rayCounts: { ...DEFAULT_ANALYSIS_RAY_COUNTS, [plotType]: 64 },
      });
      expect(proxy[method]).toHaveBeenLastCalledWith(
        mockModel,
        ...prefix,
        64,
        ...(plotType === "diffractionMTF" ? [128] : dims),
      );
      expect(await loadAnalysisPlot(params)).toEqual(first);
      expect(proxy[method]).toHaveBeenCalledTimes(2);
      await loadAnalysisPlot({
        ...params,
        rayCounts: {
          ...DEFAULT_ANALYSIS_RAY_COUNTS,
          [plotType]: defaultCount,
          [plotType === "rayFan" ? "geoPSF" : "rayFan"]: 32,
        },
      });
      expect(proxy[method]).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    [32, 64],
    [64, 128],
    [128, 256],
    [256, 512],
  ])(
    "uses and caches a %i-ray MTF with %i FFT dimensions",
    async (count, dims) => {
      const proxy = makeMockProxy();
      proxy.getDiffractionMTFData.mockResolvedValue(diffractionMtfData);
      const params = {
        plotType: "diffractionMTF" as const,
        proxy,
        model: mockModel,
        fieldIndex: 2,
        wavelengthIndex: 1,
        imagePoint: "centroid" as const,
        rayCounts: { ...DEFAULT_ANALYSIS_RAY_COUNTS, diffractionMTF: count },
      };
      const expected = {
        kind: "diffractionMTF",
        diffractionMtfData,
      };
      expect(
        await Promise.all([loadAnalysisPlot(params), loadAnalysisPlot(params)]),
      ).toEqual([expected, expected]);
      expect(await loadAnalysisPlot(params)).toEqual(expected);
      expect(proxy.getDiffractionMTFData).toHaveBeenCalledWith(
        mockModel,
        2,
        1,
        "centroid",
        count,
        dims,
      );
      expect(proxy.getDiffractionMTFData).toHaveBeenCalledTimes(1);
    },
  );
});
