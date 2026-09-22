/** Covers committed analysis tool payloads, shared chart caching, snapshots, and spot radii. */
import { createStore } from "zustand";
import { createAnalysisDataSlice } from "@/features/analysis/stores/analysisDataStore";
import { createAnalysisPlotSlice } from "@/features/analysis/stores/analysisPlotStore";
import { createLensEditorSlice } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createAnalysisTools } from "@/features/lens-editor/lib/analysisWebMcp";
import { _resetAnalysisCache } from "@/features/analysis/lib/analysisCache";
import { loadAnalysisPlot } from "@/features/analysis/lib/plotFunctions";
import { DEFAULT_ANALYSIS_RAY_COUNTS } from "@/features/analysis/lib/analysisRayCounts";
import type { ConfigurableAnalysisPlot } from "@/features/analysis/lib/analysisRayCounts";
import type { SpotDiagramData } from "@/features/analysis/types/plotData";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

const model: OpticalModel = {
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [],
  image: { curvatureRadius: 0 },
  setAutoAperture: "manualAperture",
  specs: {
    pupil: { space: "object", type: "epd", value: 25 },
    field: {
      space: "object",
      type: "angle",
      maxField: 20,
      fields: [0, 0.5, 1],
      isRelative: true,
    },
    wavelengths: {
      weights: [
        [486.133, 1],
        [587.562, 3],
        [656.273, 0],
      ],
      referenceIndex: 1,
    },
  },
};
const line = { x: [-1, 0, 1], y: [0.123456789012345, 0, -0.234567890123456] };
const fans = [0, 1, 2].map((wvlIdx) => ({
  fieldIdx: 0,
  wvlIdx,
  Sagittal: line,
  Tangential: line,
  unitX: "pupil",
  unitY: "µm",
}));
const spots: SpotDiagramData = [
  {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [0.003, 0],
    y: [0.004, 0],
    unitX: "mm",
    unitY: "mm",
  },
  { fieldIdx: 0, wvlIdx: 1, x: [0.006], y: [0.008], unitX: "mm", unitY: "mm" },
  { fieldIdx: 0, wvlIdx: 2, x: [100], y: [100], unitX: "mm", unitY: "mm" },
];
const grid = {
  fieldIdx: 0,
  wvlIdx: 1,
  x: [-1, 0, 1],
  y: [-1, 0, 1],
  z: [[0.123456789012345, 0, 0.9]],
  unitX: "mm",
  unitY: "mm",
  unitZ: "waves",
};

const cases = [
  {
    name: "get_ray_fan_data",
    plotType: "rayFan",
    method: "getRayFanData",
    selectors: ["fieldIndex"],
    data: fans,
  },
  {
    name: "get_opd_fan_data",
    plotType: "opdFan",
    method: "getOpdFanData",
    selectors: ["fieldIndex"],
    data: fans.map((series) => ({ ...series, unitY: "waves" })),
  },
  {
    name: "get_spot_diagram_data",
    plotType: "spotDiagram",
    method: "getSpotDiagramData",
    selectors: ["fieldIndex"],
    data: spots,
  },
  {
    name: "get_field_curvature_data",
    plotType: "fieldCurvature",
    method: "getFieldCurvatureData",
    selectors: ["wavelengthIndex"],
    data: {
      wvlIdx: 1,
      Tangential: line,
      Sagittal: line,
      fieldLabels: ["0°", "10°", "20°"],
      unitX: "mm",
      unitY: "degrees",
    },
  },
  {
    name: "get_astigmatism_data",
    plotType: "astigmatismCurve",
    method: "getAstigmatismCurveData",
    selectors: ["wavelengthIndex"],
    data: {
      wvlIdx: 1,
      Astigmatism: line,
      fieldLabels: ["0°", "10°", "20°"],
      unitX: "mm",
      unitY: "degrees",
    },
  },
  {
    name: "get_longitudinal_spherical_aberration_data",
    plotType: "longitudinalSphericalAberration",
    method: "getLSAData",
    selectors: [],
    data: [0, 1, 2].map((wvlIdx) => ({
      wvlIdx,
      LSA: line,
      unitX: "mm",
      unitY: "pupil",
    })),
  },
  {
    name: "get_strehl_vs_wavelength_data",
    plotType: "strehlVsWavelength",
    method: "getStrehlVsWavelengthData",
    selectors: ["fieldIndex"],
    data: {
      fieldIdx: 0,
      x: [486.133, 520.123456789, 656.273],
      y: [0.1, 0.987654321012345, 0.2],
      unitX: "nm",
      unitY: "ratio",
    },
  },
  {
    name: "get_wavefront_map_data",
    plotType: "wavefrontMap",
    method: "getWavefrontData",
    selectors: ["fieldIndex", "wavelengthIndex"],
    data: grid,
  },
  {
    name: "get_diffraction_psf_data",
    plotType: "diffractionPSF",
    method: "getDiffractionPSFData",
    selectors: ["fieldIndex", "wavelengthIndex"],
    data: { ...grid, unitZ: "intensity" },
  },
  {
    name: "get_diffraction_mtf_data",
    plotType: "diffractionMTF",
    method: "getDiffractionMTFData",
    selectors: ["fieldIndex", "wavelengthIndex"],
    data: {
      fieldIdx: 0,
      wvlIdx: 1,
      Tangential: line,
      Sagittal: line,
      IdealTangential: line,
      IdealSagittal: line,
      unitX: "cycles/mm",
      unitY: "MTF",
      cutoffTangential: 123.456789012345,
      cutoffSagittal: 125.567890123456,
      scaleKind: "image-na",
      naTangential: 0.123456789,
      naSagittal: 0.12456789,
    },
  },
] as const;
type PlotCase = (typeof cases)[number];

/** Uses real stores and loaders; only the worker boundary is mocked. */
function setup(testCase: PlotCase) {
  const lensStore = createStore(createLensEditorSlice);
  const analysisDataStore = createStore(createAnalysisDataSlice);
  const analysisPlotStore = createStore(createAnalysisPlotSlice);
  const specsStore = createStore(createSpecsConfiguratorSlice);
  lensStore.getState().setCommittedOpticalModel(model);
  analysisPlotStore.setState({
    selectedFieldIndex: 2,
    selectedWavelengthIndex: 2,
    selectedPlotType: "geoPSF",
    geoPsfData: spots[0],
    plotLoading: true,
  });
  specsStore.getState().setWavelengths({
    weights: [
      [700, 0],
      [800, 9],
    ],
    referenceIndex: 0,
  });
  const worker = jest.fn().mockResolvedValue(testCase.data);
  const proxy = { [testCase.method]: worker } as unknown as PyodideWorkerAPI;
  const deps = {
    lensStore,
    analysisDataStore,
    analysisPlotStore,
    proxy,
    imagePoint: "centroid" as const,
  };
  const findTool = (tools = createAnalysisTools(deps)) => {
    const tool = Object.values(tools).find(
      ({ name }) => name === testCase.name,
    );
    if (!tool) throw new Error(`Missing tool ${testCase.name}`);
    return tool;
  };
  const tool = findTool();
  const query = async (
    input: unknown = {},
    signal = new AbortController().signal,
  ) =>
    JSON.parse(
      String(await tool.execute(input as Record<string, unknown>, { signal })),
    );
  const chartLoad = (fieldIndex = 0, wavelengthIndex = 1) =>
    loadAnalysisPlot({
      proxy,
      model: lensStore.getState().committedOpticalModel,
      plotType: testCase.plotType,
      fieldIndex,
      wavelengthIndex,
      imagePoint: "centroid",
      rayCounts: analysisPlotStore.getState().rayCounts,
    });
  return { ...deps, specsStore, worker, tool, query, chartLoad, findTool };
}

function expectedArgs(
  testCase: PlotCase,
  fieldIndex: number,
  wavelengthIndex: number,
  numRays?: number,
) {
  switch (testCase.plotType) {
    case "fieldCurvature":
    case "astigmatismCurve":
      return [model, wavelengthIndex];
    case "longitudinalSphericalAberration":
      return [model];
    case "rayFan":
    case "opdFan":
    case "spotDiagram":
      return [model, fieldIndex, "centroid", numRays];
    case "strehlVsWavelength":
      return [model, fieldIndex, "centroid", 100, numRays];
    case "wavefrontMap":
      return [model, fieldIndex, wavelengthIndex, "centroid", numRays];
    case "diffractionPSF":
      return [model, fieldIndex, wavelengthIndex, "centroid", numRays, 1024];
    case "diffractionMTF":
      return [
        model,
        fieldIndex,
        wavelengthIndex,
        "centroid",
        numRays,
        2 * numRays!,
      ];
  }
}

describe.each(cases)("$name", (testCase) => {
  const selectors: readonly string[] = testCase.selectors;
  const configurable = testCase.plotType in DEFAULT_ANALYSIS_RAY_COUNTS;
  const countKey = testCase.plotType as ConfigurableAnalysisPlot;
  const defaultCount = configurable
    ? DEFAULT_ANALYSIS_RAY_COUNTS[countKey]
    : undefined;
  beforeEach(() => {
    _resetAnalysisCache();
    localStorage.clear();
  });

  it("returns the full payload and committed defaults without changing application state", async () => {
    const s = setup(testCase);
    const stores = [
      s.lensStore,
      s.analysisDataStore,
      s.analysisPlotStore,
      s.specsStore,
    ];
    const before = stores.map((store) => store.getState());
    const result = await s.query();
    expect(result).toEqual({
      data: testCase.data,
      imagePoint: "centroid",
      ...(selectors.includes("fieldIndex") ? { fieldIndex: 0 } : {}),
      ...(selectors.includes("wavelengthIndex") ? { wavelengthIndex: 1 } : {}),
      ...(configurable ? { numRays: defaultCount } : {}),
      ...(testCase.plotType === "spotDiagram"
        ? { radii: { geoRadius: 10, rmsRadius: Math.sqrt(65), unit: "µm" } }
        : {}),
    });
    expect(s.worker).toHaveBeenCalledWith(
      ...expectedArgs(testCase, 0, 1, defaultCount),
    );
    expect(s.worker.mock.calls[0][0]).toBe(model);
    stores.forEach((store, index) =>
      expect(store.getState()).toBe(before[index]),
    );
    expect(s.tool.annotations?.readOnlyHint).toBe(true);
    expect(s.tool.description).toContain("recompute_optical_system");
    expect(s.tool.inputSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
    });
    expect(Object.keys(s.tool.inputSchema?.properties ?? {})).toEqual(
      selectors,
    );
  });

  it("resolves explicit selectors against committed bounds", async () => {
    const s = setup(testCase);
    const input = Object.fromEntries(
      selectors.map((key) => [key, key === "fieldIndex" ? 2 : 0]),
    );
    expect(await s.query(input)).toMatchObject(input);
    expect(s.worker).toHaveBeenCalledWith(
      ...expectedArgs(testCase, 2, 0, defaultCount),
    );
  });

  it("rejects unsupported properties and malformed or out-of-range selectors before computing", async () => {
    const s = setup(testCase);
    const invalid: unknown[] = [
      null,
      [],
      "",
      { extra: true },
      { imagePoint: "chief_ray" },
      { numRays: 64 },
    ];
    for (const selector of ["fieldIndex", "wavelengthIndex"]) {
      if (selectors.includes(selector)) {
        for (const value of [-1, 0.5, "0", null, Infinity, NaN, 3])
          invalid.push({ [selector]: value });
      } else invalid.push({ [selector]: 0 });
    }
    for (const input of invalid)
      await expect(s.query(input)).rejects.toThrow("Invalid input at /");
    expect(s.worker).not.toHaveBeenCalled();
  });

  it("guides callers when the model or worker is unavailable", async () => {
    const s = setup(testCase);
    s.lensStore.setState({ committedOpticalModel: undefined });
    await expect(s.query()).rejects.toThrow("recompute_optical_system");
    s.lensStore.getState().setCommittedOpticalModel(model);
    const tool = s.findTool(createAnalysisTools({ ...s, proxy: undefined }));
    await expect(
      tool.execute({}, { signal: new AbortController().signal }),
    ).rejects.toThrow(
      `Pyodide not ready. Wait for app initialization to finish, then retry ${testCase.name}.`,
    );
    expect(s.worker).not.toHaveBeenCalled();
  });

  it.each(["chart", "tool"])(
    "shares completed results when the %s loads first",
    async (first) => {
      const s = setup(testCase);
      if (first === "chart") {
        await s.chartLoad();
        await s.query();
      } else {
        await s.query();
        await s.chartLoad();
      }
      expect(s.worker).toHaveBeenCalledTimes(1);
    },
  );

  it("coalesces concurrent chart/tool calls and isolates caller cancellation", async () => {
    const s = setup(testCase);
    const controller = new AbortController();
    controller.abort();
    await expect(s.query({}, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(s.worker).not.toHaveBeenCalled();
    let resolve!: (data: unknown) => void;
    s.worker.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const cancelled = new AbortController();
    const request = s.query({}, cancelled.signal);
    const rejection = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    const chart = s.chartLoad();
    const other = s.query();
    cancelled.abort();
    resolve(testCase.data);
    await rejection;
    await chart;
    expect((await other).data).toEqual(testCase.data);
    await s.query();
    expect(s.worker).toHaveBeenCalledTimes(1);
  });

  it("evicts a failed request so another caller can retry", async () => {
    const s = setup(testCase);
    s.worker.mockRejectedValueOnce(new Error("Trace failed"));
    await expect(s.query()).rejects.toThrow("Trace failed");
    expect((await s.query()).data).toEqual(testCase.data);
    await s.chartLoad();
    expect(s.worker).toHaveBeenCalledTimes(2);
  });

  it("partitions by relevant selectors, exact model identity, and image reference", async () => {
    const s = setup(testCase);
    await s.query();
    let calls = 1;
    for (const selector of selectors) {
      await s.query({ [selector]: selector === "fieldIndex" ? 1 : 0 });
      expect(s.worker).toHaveBeenCalledTimes(++calls);
    }
    await s.chartLoad(
      selectors.includes("fieldIndex") ? 0 : 2,
      selectors.includes("wavelengthIndex") ? 1 : 0,
    );
    expect(s.worker).toHaveBeenCalledTimes(calls);
    const alternate = s.findTool(
      createAnalysisTools({ ...s, imagePoint: "chief_ray" }),
    );
    await alternate.execute({}, { signal: new AbortController().signal });
    expect(s.worker).toHaveBeenCalledTimes(++calls);
    s.lensStore.getState().setCommittedOpticalModel({ ...model });
    await s.query();
    expect(s.worker).toHaveBeenCalledTimes(++calls);
    expect(s.worker.mock.calls.at(-1)?.[0]).toBe(
      s.lensStore.getState().committedOpticalModel,
    );
  });

  it("reads live sampling preferences and ignores unrelated preferences", async () => {
    const s = setup(testCase);
    await s.query();
    s.analysisPlotStore.getState().setRayCount("geoPSF", 32);
    await s.query();
    expect(s.worker).toHaveBeenCalledTimes(1);
    if (configurable) {
      s.analysisPlotStore.getState().setRayCount(countKey, 64);
      expect((await s.query()).numRays).toBe(64);
      expect(s.worker).toHaveBeenLastCalledWith(
        ...expectedArgs(testCase, 0, 1, 64),
      );
      await s.chartLoad();
      expect(s.worker).toHaveBeenCalledTimes(2);
      s.analysisPlotStore.getState().setRayCount(countKey, defaultCount!);
      await s.query();
      expect(s.worker).toHaveBeenCalledTimes(2);
    }
  });

  it("retains the invocation snapshot while the committed model and preferences change", async () => {
    const s = setup(testCase);
    let resolve!: (data: unknown) => void;
    s.worker.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const request = s.query();
    s.lensStore.getState().setCommittedOpticalModel({
      ...model,
      specs: {
        ...model.specs,
        wavelengths: { weights: [[700, 0]], referenceIndex: 0 },
      },
    });
    if (configurable) s.analysisPlotStore.getState().setRayCount(countKey, 64);
    resolve(testCase.data);
    const result = await request;
    expect(result.data).toEqual(testCase.data);
    if (configurable) expect(result.numRays).toBe(defaultCount);
    if (selectors.includes("wavelengthIndex"))
      expect(result.wavelengthIndex).toBe(1);
    if (testCase.plotType === "spotDiagram")
      expect(result.radii).toEqual({
        geoRadius: 10,
        rmsRadius: Math.sqrt(65),
        unit: "µm",
      });
    expect(s.worker).toHaveBeenCalledWith(
      ...expectedArgs(testCase, 0, 1, defaultCount),
    );
  });
});

describe("Spot Diagram radii", () => {
  beforeEach(() => {
    _resetAnalysisCache();
    localStorage.clear();
  });
  it.each([
    ["mm", 0.001, "µm"],
    ["cm", 0.0001, "µm"],
    ["m", 0.000001, "µm"],
    ["µm", 1, "µm"],
    ["arcsec", 1, "arcsec"],
  ])(
    "converts %s coordinates without recentering or rounding",
    async (inputUnit, scale, unit) => {
      const s = setup(cases[2]);
      const data = [
        {
          ...spots[0],
          x: [1.23456789012345 * scale],
          y: [2.34567890123456 * scale],
          unitX: inputUnit,
          unitY: inputUnit,
        },
      ];
      s.worker.mockResolvedValue(data);
      const result = await s.query();
      expect(result.data).toEqual(data);
      expect(result.radii.unit).toBe(unit);
      expect(result.radii.geoRadius).toBeCloseTo(
        Math.hypot(1.23456789012345, 2.34567890123456),
        14,
      );
      expect(result.radii.rmsRadius).toBeCloseTo(result.radii.geoRadius, 14);
    },
  );

  it("uses all positive committed weights despite pending draft weight edits", async () => {
    const s = setup(cases[2]);
    s.specsStore.getState().setWavelengths({
      weights: [
        [486.133, 0],
        [587.562, 0],
        [656.273, 99],
      ],
      referenceIndex: 2,
    });
    expect((await s.query()).radii).toEqual({
      geoRadius: 10,
      rmsRadius: Math.sqrt(65),
      unit: "µm",
    });
    s.lensStore.getState().setCommittedOpticalModel({
      ...model,
      specs: {
        ...model.specs,
        wavelengths: {
          weights: [
            [486.133, 1],
            [587.562, 0],
            [656.273, 0],
          ],
          referenceIndex: 0,
        },
      },
    });
    expect((await s.query()).radii).toEqual({
      geoRadius: 5,
      rmsRadius: Math.sqrt(12.5),
      unit: "µm",
    });
  });

  it.each([
    [[]],
    [[{ ...spots[0], x: [], y: [] }]],
    [[{ ...spots[0], unitX: "unknown" }]],
    [[{ ...spots[0], unitX: "arcsec" }]],
    [[{ ...spots[0], wvlIdx: 2 }]],
  ])("preserves point data but omits unavailable radii: %p", async (data) => {
    const s = setup(cases[2]);
    s.worker.mockResolvedValue(data);
    const result = await s.query();
    expect(result.data).toEqual(data);
    expect(result).not.toHaveProperty("radii");
  });
});
