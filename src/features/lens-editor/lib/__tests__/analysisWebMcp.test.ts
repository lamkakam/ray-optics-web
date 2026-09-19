/** Covers analysis freshness across computation and optimization Apply, Zernike selectors, and shared caches. */
import { createStore } from "zustand";
import { createAnalysisDataSlice } from "@/features/analysis/stores/analysisDataStore";
import { createAnalysisPlotSlice } from "@/features/analysis/stores/analysisPlotStore";
import { createLensLayoutImageSlice } from "@/features/analysis/stores/lensLayoutImageStore";
import { createLensEditorSlice } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createAnalysisTools } from "@/features/lens-editor/lib/analysisWebMcp";
import { computeOpticalSystem } from "@/features/lens-editor/lib/opticalSystemComputation";
import { createOpticalSystemTools } from "@/features/lens-editor/lib/opticalSystemWebMcp";
import { applyExampleSystem } from "@/features/example-systems/lib/applyExampleSystem";
import { applyOptimizationModelToEditor } from "@/features/optimization/lib/applyOptimizationModelToEditor";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { _resetAnalysisCache } from "@/features/analysis/lib/analysisCache";
import { loadZernikeData } from "@/features/analysis/lib/plotFunctions";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData } from "@/features/lens-editor/types/zernikeData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";

const model: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10,
    },
  ],
  image: { curvatureRadius: 0 },
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
        [587.562, 1],
      ],
      referenceIndex: 1,
    },
  },
};

const seidel: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["Front", "Rear", "sum"],
    data: [
      [1, 2, 3],
      [2, 3, 5],
      [3, 4, 7],
      [4, 5, 9],
      [5, 6, 11],
    ],
  },
  transverse: { TSA: 1, TCO: 2, TAS: 3, SAS: 4, PTB: 5, DST: 6 },
  wavefront: { W040: 7, W131: 8, W222: 9, W220: 10, W311: 11 },
  curvature: { TCV: 12, SCV: 13, PCV: 14 },
};

function zernikeData(numTerms = 37): ZernikeData {
  return {
    coefficients: Array.from(
      { length: numTerms },
      (_, i) => (i + 1) * 0.00123456789,
    ),
    rms_normalized_coefficients: Array.from(
      { length: numTerms },
      (_, i) => (i + 1) * 0.000123456789,
    ),
    rms_wfe: 0.05,
    pv_wfe: 0.18,
    weighted_mean_wfe: 0.002,
    fit_residual_rms: 0.0017,
    fit_rank: numTerms,
    condition_number: 12.4,
    strehl_ratio: 0.89,
    strehl_assumption: "uniform_scalar_amplitude_at_reference_point",
    num_terms: numTerms,
    field_index: 0,
    wavelength_nm: 587.562,
    pupil_space: "entrance",
    sampling_measure: "uniform_normalized_input_pupil_cells",
    normalization: "normalized_input_pupil",
    reference_kind: "finite_reference_sphere",
    reference_length_unit: "mm",
    reference_radius: 10,
    reference_center: [0, 0, 1],
    reference_pupil_point: [0, 0, 9],
    reference_x_axis: [1, 0, 0],
    reference_y_axis: [0, 1, 0],
    reference_z_axis: [0, 0, 1],
    normalization_radius: 1,
    support_area: 3.1,
    support_coverage: 0.99,
    sample_count: 1200,
    boundary_resolution: 127,
    boundary_converged: true,
  };
}

function setup(imagePoint: ImagePoint = "centroid") {
  const lensStore = createStore(createLensEditorSlice);
  const analysisDataStore = createStore(createAnalysisDataSlice);
  const specsStore = createStore(createSpecsConfiguratorSlice);
  const getZernikeCoefficients = jest
    .fn<
      ReturnType<PyodideWorkerAPI["getZernikeCoefficients"]>,
      Parameters<PyodideWorkerAPI["getZernikeCoefficients"]>
    >()
    .mockImplementation(
      async (
        _model,
        fieldIndex,
        wavelengthIndex,
        _point,
        numTerms,
        _ordering,
        pupilSpace,
      ) => ({
        ...zernikeData(numTerms),
        field_index: fieldIndex,
        wavelength_nm: model.specs.wavelengths.weights[wavelengthIndex][0],
        pupil_space: pupilSpace ?? "entrance",
      }),
    );
  const proxy = { getZernikeCoefficients } as unknown as PyodideWorkerAPI;
  lensStore.getState().setCommittedOpticalModel(model);
  analysisDataStore
    .getState()
    .setFirstOrderData(
      { efl: 100.123456789, fno: 4, extraWorkerMetric: 12 },
      model,
    );
  analysisDataStore.getState().setSeidelData(seidel, model);
  const deps = { lensStore, analysisDataStore, proxy, imagePoint };
  const tools = createAnalysisTools(deps);
  const execute = async (
    tool: WebMCP.ModelContextTool,
    input: unknown = {},
    signal = new AbortController().signal,
  ) => tool.execute(input as Record<string, unknown>, { signal });
  const query = (input: unknown = {}, signal?: AbortSignal) =>
    execute(tools.getZernikeTerms, input, signal);
  const dialogLoad = () =>
    loadZernikeData({
      proxy,
      model,
      imagePoint,
      fieldIndex: 0,
      wavelengthIndex: 1,
      ordering: "fringe",
      numTerms: 37,
      pupilSpace: "entrance",
    });
  return {
    ...deps,
    tools,
    specsStore,
    getZernikeCoefficients,
    execute,
    query,
    dialogLoad,
  };
}

/** Exercises real computation and Apply helpers, mocking only worker results. */
function computationSetup() {
  const s = setup();
  s.lensStore.setState({ committedOpticalModel: undefined });
  s.analysisDataStore.getState().setFirstOrderData(undefined);
  s.analysisDataStore.getState().setSeidelData(undefined);
  s.lensStore.getState().setRows(surfacesToGridRows(model));
  s.lensStore.getState().setAutoAperture(false);
  s.specsStore.getState().loadFromSpecs(model.specs);
  const worker = {
    getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue(seidel),
    plotLensLayout: jest.fn().mockResolvedValue("layout"),
    getRayFanData: jest.fn().mockResolvedValue([]),
    focusByMonoRmsSpot: jest
      .fn()
      .mockResolvedValue({ delta_thi: 0.5, metric_value: 0.01 }),
  };
  const proxy = { ...s.proxy, ...worker };
  const deps = {
    ...s,
    proxy,
    analysisPlotStore: createStore(createAnalysisPlotSlice),
    lensLayoutImageStore: createStore(createLensLayoutImageSlice),
    lookupMaps: undefined,
    selectedFieldIndex: 0,
    selectedWavelengthIndex: 1,
    selectedPlotType: "rayFan" as const,
    isDark: false,
  };
  const appliedModel: OpticalModel = {
    ...model,
    surfaces: [{ ...model.surfaces[0], curvatureRadius: 75 }],
  };
  return {
    ...deps,
    worker,
    appliedModel,
    compute: (signal?: AbortSignal) =>
      computeOpticalSystem({ ...deps, signal }),
    apply: () =>
      applyOptimizationModelToEditor({ ...deps, model: appliedModel }),
  };
}

describe("analysis WebMCP tools", () => {
  beforeEach(() => _resetAnalysisCache());

  it.each(["getParaxialData", "get3rdOrderSeidelData"] as const)(
    "rejects %s from compute A after Apply B while Zernike computes B",
    async (getter) => {
      const s = computationSetup();
      const computed = await s.compute();
      const previousAnalysis = s.analysisDataStore.getState();
      expect(previousAnalysis.firstOrderDataModel).toBe(computed.model);
      expect(previousAnalysis.seidelDataModel).toBe(computed.model);
      await s.apply();
      expect(s.analysisDataStore.getState()).toBe(previousAnalysis);
      await s.query();
      expect(s.getZernikeCoefficients.mock.calls[0][0]).toBe(s.appliedModel);
      await expect(s.execute(s.tools[getter])).rejects.toThrow(
        "recompute_optical_system",
      );
      expect(s.worker.getFirstOrderData).toHaveBeenCalledTimes(1);
      expect(s.worker.get3rdOrderSeidelData).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["recompute", "focus"] as const)(
    "serves fresh stored results after successful %s following Apply",
    async (action) => {
      const s = computationSetup();
      await s.compute();
      await s.apply();
      const nextSeidel = { ...seidel, transverse: { TSA: 20 } };
      s.worker.getFirstOrderData.mockResolvedValue({ efl: 200 });
      s.worker.get3rdOrderSeidelData.mockResolvedValue(nextSeidel);
      const opticalTools = createOpticalSystemTools(s);
      await s.execute(
        action === "recompute"
          ? opticalTools.recomputeOpticalSystem
          : opticalTools.focusOpticalSystem,
        action === "recompute"
          ? {}
          : { chromaticity: "mono", metric: "rmsSpot", fieldIndex: 0 },
      );
      const committed = s.lensStore.getState().committedOpticalModel;
      expect(committed).toBeDefined();
      expect(committed).not.toBe(s.appliedModel);
      expect(s.analysisDataStore.getState().firstOrderDataModel).toBe(
        committed,
      );
      expect(s.analysisDataStore.getState().seidelDataModel).toBe(committed);
      await expect(s.execute(s.tools.getParaxialData)).resolves.toBe(
        JSON.stringify({ efl: 200 }),
      );
      await expect(s.execute(s.tools.get3rdOrderSeidelData)).resolves.toBe(
        JSON.stringify(nextSeidel),
      );
    },
  );

  it.each(["failure", "cancellation"] as const)(
    "retains results and ownership after recomputation %s, rejecting stale reads",
    async (outcome) => {
      const s = computationSetup();
      await s.compute();
      await s.apply();
      const previousAnalysis = s.analysisDataStore.getState();
      const controller = new AbortController();
      s.worker.plotLensLayout.mockImplementationOnce(async () => {
        if (outcome === "failure") throw new Error("layout failed");
        controller.abort();
        return "new-layout";
      });
      await expect(s.compute(controller.signal)).rejects.toThrow(
        outcome === "failure" ? "layout failed" : /cancelled/i,
      );
      expect(s.analysisDataStore.getState()).toBe(previousAnalysis);
      expect(s.lensStore.getState().committedOpticalModel).toBe(s.appliedModel);
      for (const tool of [
        s.tools.getParaxialData,
        s.tools.get3rdOrderSeidelData,
      ]) {
        await expect(s.execute(tool)).rejects.toThrow(
          "recompute_optical_system",
        );
      }
    },
  );

  it("keeps computed results readable after ordinary draft edits", async () => {
    const s = computationSetup();
    const computed = await s.compute();
    s.lensStore.getState().addRowAfter("object");
    s.specsStore
      .getState()
      .setWavelengths({ weights: [[700, 1]], referenceIndex: 0 });
    expect(s.lensStore.getState().committedOpticalModel).toBe(computed.model);
    await expect(s.execute(s.tools.getParaxialData)).resolves.toBe(
      JSON.stringify({ efl: 100 }),
    );
    await expect(s.execute(s.tools.get3rdOrderSeidelData)).resolves.toBe(
      JSON.stringify(seidel),
    );
  });

  it("records the exact source of successful example results", async () => {
    const s = computationSetup();
    await applyExampleSystem({ ...s, model: s.appliedModel });
    expect(s.analysisDataStore.getState().firstOrderDataModel).toBe(
      s.appliedModel,
    );
    expect(s.analysisDataStore.getState().seidelDataModel).toBe(s.appliedModel);
    await expect(s.execute(s.tools.getParaxialData)).resolves.toBe(
      JSON.stringify({ efl: 100 }),
    );
    await expect(s.execute(s.tools.get3rdOrderSeidelData)).resolves.toBe(
      JSON.stringify(seidel),
    );
  });

  it("retains computed results and ownership when example loading fails", async () => {
    const s = computationSetup();
    const computed = await s.compute();
    const previousAnalysis = s.analysisDataStore.getState();
    s.worker.plotLensLayout.mockRejectedValueOnce(new Error("layout failed"));
    await expect(
      applyExampleSystem({ ...s, model: s.appliedModel }),
    ).rejects.toThrow("layout failed");
    expect(s.analysisDataStore.getState()).toBe(previousAnalysis);
    expect(s.lensStore.getState().committedOpticalModel).toBe(computed.model);
  });

  describe.each(["getParaxialData", "get3rdOrderSeidelData"] as const)(
    "%s ownership checks",
    (getter) => {
      it.each([
        "missing source",
        "missing committed model",
        "missing source and committed model",
        "equal but distinct model",
        "cleared result",
      ] as const)("requires recomputation for %s", async (condition) => {
        const s = setup();
        const isParaxial = getter === "getParaxialData";
        if (
          condition === "missing source" ||
          condition === "missing source and committed model"
        ) {
          if (isParaxial)
            s.analysisDataStore.getState().setFirstOrderData({ efl: 100 });
          else s.analysisDataStore.getState().setSeidelData(seidel);
        }
        if (
          condition === "missing committed model" ||
          condition === "missing source and committed model"
        ) {
          s.lensStore.setState({ committedOpticalModel: undefined });
        } else if (condition === "equal but distinct model") {
          s.lensStore.getState().setCommittedOpticalModel({ ...model });
        } else if (condition === "cleared result") {
          if (isParaxial)
            s.analysisDataStore.getState().setFirstOrderData(undefined, model);
          else s.analysisDataStore.getState().setSeidelData(undefined, model);
        }
        await expect(s.execute(s.tools[getter])).rejects.toThrow(
          "recompute_optical_system",
        );
      });
    },
  );

  it("marks all tools read-only and explains committed results", () => {
    const { tools } = setup();
    for (const tool of Object.values(tools)) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: false,
      });
      expect(tool.description).toContain(
        "Reads the current committed optical system. To include pending Lens Editor edits, call `recompute_optical_system` first.",
      );
    }
    for (const tool of [tools.getParaxialData, tools.get3rdOrderSeidelData]) {
      expect(tool.description).toContain(
        "Stored results must belong to that exact model; after optimization Apply, call `recompute_optical_system` if results are missing or stale.",
      );
    }
  });

  it("returns complete committed paraxial and Seidel data after draft edits without computing", async () => {
    const s = setup();
    s.lensStore.getState().addRowAfter("object");
    s.specsStore
      .getState()
      .setWavelengths({ weights: [[700, 1]], referenceIndex: 0 });
    const beforeLens = s.lensStore.getState();
    const beforeAnalysis = s.analysisDataStore.getState();
    expect(
      JSON.parse(String(await s.execute(s.tools.getParaxialData))),
    ).toEqual(beforeAnalysis.firstOrderData);
    expect(
      JSON.parse(String(await s.execute(s.tools.get3rdOrderSeidelData))),
    ).toEqual(seidel);
    expect(s.getZernikeCoefficients).not.toHaveBeenCalled();
    expect(s.lensStore.getState()).toBe(beforeLens);
    expect(s.analysisDataStore.getState()).toBe(beforeAnalysis);
    s.analysisDataStore.getState().setFirstOrderData({ efl: 200 }, model);
    s.analysisDataStore
      .getState()
      .setSeidelData({ ...seidel, transverse: { TSA: 20 } }, model);
    expect(
      JSON.parse(String(await s.execute(s.tools.getParaxialData))),
    ).toEqual({ efl: 200 });
    expect(
      JSON.parse(String(await s.execute(s.tools.get3rdOrderSeidelData))),
    ).toEqual({ ...seidel, transverse: { TSA: 20 } });
  });

  it("reads stored paraxial and Seidel data without a worker", async () => {
    const s = setup();
    const tools = createAnalysisTools({ ...s, proxy: undefined });
    await expect(s.execute(tools.getParaxialData)).resolves.toBe(
      JSON.stringify(s.analysisDataStore.getState().firstOrderData),
    );
    await expect(s.execute(tools.get3rdOrderSeidelData)).resolves.toBe(
      JSON.stringify(seidel),
    );
    await expect(s.execute(tools.getZernikeTerms)).rejects.toThrow(
      /Pyodide.*ready/,
    );
  });

  it("provides a recompute action when committed data is missing", async () => {
    const s = setup();
    s.lensStore.setState({ committedOpticalModel: undefined });
    s.analysisDataStore.getState().setFirstOrderData(undefined);
    s.analysisDataStore.getState().setSeidelData(undefined);
    for (const tool of Object.values(s.tools)) {
      await expect(s.execute(tool)).rejects.toThrow("recompute_optical_system");
    }
    expect(s.getZernikeCoefficients).not.toHaveBeenCalled();
  });

  it.each([null, [], "", { extra: true }])(
    "strictly validates empty getters: %p",
    async (input) => {
      const s = setup();
      for (const tool of [
        s.tools.getParaxialData,
        s.tools.get3rdOrderSeidelData,
      ]) {
        await expect(s.execute(tool, input)).rejects.toThrow(
          "Invalid input at /",
        );
      }
    },
  );

  it("defaults to committed reference wavelength, field 0, 37 Fringe terms, and entrance pupil", async () => {
    const s = setup();
    s.specsStore
      .getState()
      .setWavelengths({ weights: [[700, 1]], referenceIndex: 0 });
    const beforeLens = s.lensStore.getState();
    const result = JSON.parse(String(await s.query()));
    expect(s.getZernikeCoefficients).toHaveBeenCalledWith(
      model,
      0,
      1,
      "centroid",
      37,
      "fringe",
      "entrance",
    );
    expect(s.getZernikeCoefficients.mock.calls[0][0]).toBe(model);
    expect(result).toEqual({
      ...zernikeData(),
      fieldIndex: 0,
      wavelengthIndex: 1,
      ordering: "fringe",
      pupilSpace: "entrance",
      imagePoint: "centroid",
      terms: expect.any(Array),
    });
    expect(result.terms).toHaveLength(37);
    expect(result.terms[0]).toEqual({
      j: 1,
      n: 0,
      m: 0,
      name: "Piston",
      coefficient: zernikeData().coefficients[0],
      rmsNormalizedCoefficient: zernikeData().rms_normalized_coefficients[0],
    });
    expect(result.terms[3]).toEqual({
      j: 4,
      n: 2,
      m: 0,
      name: "Defocus",
      coefficient: zernikeData().coefficients[3],
      rmsNormalizedCoefficient: zernikeData().rms_normalized_coefficients[3],
    });
    expect(s.lensStore.getState()).toBe(beforeLens);
  });

  it("supports explicit field, wavelength, Noll ordering, and exit pupil selectors", async () => {
    const s = setup();
    const result = JSON.parse(
      String(
        await s.query({
          fieldIndex: 2,
          wavelengthIndex: 0,
          ordering: "noll",
          pupilSpace: "exit",
        }),
      ),
    );
    expect(s.getZernikeCoefficients).toHaveBeenCalledWith(
      model,
      2,
      0,
      "centroid",
      56,
      "noll",
      "exit",
    );
    expect(result).toMatchObject({
      fieldIndex: 2,
      wavelengthIndex: 0,
      ordering: "noll",
      pupilSpace: "exit",
      field_index: 2,
      wavelength_nm: 486.133,
      pupil_space: "exit",
    });
    expect(result.terms).toHaveLength(56);
    expect(result.terms[4]).toEqual({
      j: 5,
      n: 2,
      m: -2,
      name: "Oblique Astigmatism",
      coefficient: zernikeData(56).coefficients[4],
      rmsNormalizedCoefficient: zernikeData(56).rms_normalized_coefficients[4],
    });
    expect(result.terms[55]).toMatchObject({
      j: 56,
      n: 10,
      m: 0,
      name: "Quaternary Spherical",
    });
  });

  it.each([
    [null, "/"],
    [[], "/"],
    ["", "/"],
    [{ fieldIndex: -1 }, "/fieldIndex"],
    [{ fieldIndex: 0.5 }, "/fieldIndex"],
    [{ fieldIndex: "0" }, "/fieldIndex"],
    [{ fieldIndex: 3 }, "/fieldIndex"],
    [{ fieldIndex: Infinity }, "/fieldIndex"],
    [{ fieldIndex: NaN }, "/fieldIndex"],
    [{ wavelengthIndex: -1 }, "/wavelengthIndex"],
    [{ wavelengthIndex: 0.5 }, "/wavelengthIndex"],
    [{ wavelengthIndex: "1" }, "/wavelengthIndex"],
    [{ wavelengthIndex: 2 }, "/wavelengthIndex"],
    [{ ordering: "Fringe" }, "/ordering"],
    [{ ordering: null }, "/ordering"],
    [{ pupilSpace: "image" }, "/pupilSpace"],
    [{ pupilSpace: null }, "/pupilSpace"],
    [{ numTerms: 10 }, "/numTerms"],
    [{ imagePoint: "chief_ray" }, "/imagePoint"],
  ])("rejects invalid Zernike selectors %p", async (input, path) => {
    const s = setup();
    await expect(s.query(input)).rejects.toThrow(`Invalid input at ${path}`);
    expect(s.getZernikeCoefficients).not.toHaveBeenCalled();
  });

  it.each([1e8 + 1, -1e8 - 1])(
    "rejects exit pupil for infinite final image gap %p while permitting entrance",
    async (thickness) => {
      const s = setup();
      s.lensStore.getState().setCommittedOpticalModel({
        ...model,
        surfaces: [{ ...model.surfaces[0], thickness }],
      });
      await expect(s.query({ pupilSpace: "exit" })).rejects.toThrow(/entrance/);
      expect(s.getZernikeCoefficients).not.toHaveBeenCalled();
      await expect(s.query()).resolves.toEqual(expect.any(String));
    },
  );

  it.each([1e8, -1e8])(
    "allows exit pupil at the finite image gap boundary %p",
    async (thickness) => {
      const s = setup();
      s.lensStore.getState().setCommittedOpticalModel({
        ...model,
        surfaces: [{ ...model.surfaces[0], thickness }],
      });
      await expect(s.query({ pupilSpace: "exit" })).resolves.toEqual(
        expect.any(String),
      );
    },
  );

  it.each(["dialog", "tool"])(
    "shares completed Zernike data when the %s loads first",
    async (first) => {
      const s = setup();
      if (first === "dialog") {
        await s.dialogLoad();
        await s.query();
      } else {
        await s.query();
        await s.dialogLoad();
      }
      expect(s.getZernikeCoefficients).toHaveBeenCalledTimes(1);
    },
  );

  it("coalesces in-flight dialog and tool requests while cancellation affects only its caller", async () => {
    const s = setup();
    let resolve!: (data: ZernikeData) => void;
    s.getZernikeCoefficients.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const controller = new AbortController();
    const cancelled = s.query({}, controller.signal);
    const rejection = expect(cancelled).rejects.toMatchObject({
      name: "AbortError",
    });
    const shared = s.query();
    const dialog = s.dialogLoad();
    controller.abort();
    resolve(zernikeData());
    await rejection;
    await expect(shared).resolves.toEqual(expect.any(String));
    await expect(dialog).resolves.toEqual(zernikeData());
    await s.query();
    expect(s.getZernikeCoefficients).toHaveBeenCalledTimes(1);
  });

  it("rejects all already-cancelled calls before starting computation", async () => {
    const s = setup();
    const controller = new AbortController();
    controller.abort();
    for (const tool of Object.values(s.tools)) {
      await expect(
        s.execute(tool, {}, controller.signal),
      ).rejects.toMatchObject({ name: "AbortError" });
    }
    expect(s.getZernikeCoefficients).not.toHaveBeenCalled();
  });

  it("separates all selectors, the model instance, and the current image reference", async () => {
    const s = setup();
    for (const input of [
      {},
      { fieldIndex: 1 },
      { wavelengthIndex: 0 },
      { ordering: "noll" },
      { pupilSpace: "exit" },
      {},
    ])
      await s.query(input);
    expect(s.getZernikeCoefficients).toHaveBeenCalledTimes(5);
    const otherReference = createAnalysisTools({
      ...s,
      imagePoint: "chief_ray",
    });
    await s.execute(otherReference.getZernikeTerms);
    expect(s.getZernikeCoefficients).toHaveBeenCalledTimes(6);
    s.lensStore.getState().setCommittedOpticalModel({ ...model });
    await s.query();
    expect(s.getZernikeCoefficients).toHaveBeenCalledTimes(7);
  });

  it("evicts failures and permits a later dialog request to retry", async () => {
    const s = setup();
    s.getZernikeCoefficients.mockRejectedValueOnce(
      new Error("Ray tracing failed"),
    );
    await expect(s.query()).rejects.toThrow("Ray tracing failed");
    await expect(s.dialogLoad()).resolves.toEqual(zernikeData());
    await s.query();
    expect(s.getZernikeCoefficients).toHaveBeenCalledTimes(2);
  });
});
