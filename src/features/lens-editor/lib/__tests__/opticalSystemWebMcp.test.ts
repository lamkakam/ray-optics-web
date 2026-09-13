import { createStore } from "zustand";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  createAnalysisDataSlice,
  type AnalysisDataState,
} from "@/features/analysis/stores/analysisDataStore";
import {
  createAnalysisPlotSlice,
  type AnalysisPlotState,
} from "@/features/analysis/stores/analysisPlotStore";
import {
  createLensLayoutImageSlice,
  type LensLayoutImageState,
} from "@/features/analysis/stores/lensLayoutImageStore";
import {
  createLensEditorSlice,
  type LensEditorState,
} from "@/features/lens-editor/stores/lensEditorStore";
import {
  createSpecsConfiguratorSlice,
  type SpecsConfiguratorState,
} from "@/features/lens-editor/stores/specsConfiguratorStore";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { createOpticalSystemTools } from "@/features/lens-editor/lib/opticalSystemWebMcp";

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
      isWideAngle: false,
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

const lookupMaps: GlassLookupMaps = {
  manufacturerMap: new Map(),
  mediumMap: new Map(),
  customMediumMap: new Map(),
};

function makeStores() {
  const lensStore = createStore<LensEditorState>(createLensEditorSlice);
  const specsStore = createStore<SpecsConfiguratorState>(
    createSpecsConfiguratorSlice,
  );
  const analysisPlotStore = createStore<AnalysisPlotState>(
    createAnalysisPlotSlice,
  );
  const analysisDataStore = createStore<AnalysisDataState>(
    createAnalysisDataSlice,
  );
  const lensLayoutImageStore = createStore<LensLayoutImageState>(
    createLensLayoutImageSlice,
  );
  lensStore.getState().setRows(surfacesToGridRows(model));
  specsStore.getState().loadFromSpecs(model.specs);
  return {
    lensStore,
    specsStore,
    analysisPlotStore,
    analysisDataStore,
    lensLayoutImageStore,
  };
}

function makeProxy(
  overrides: Partial<PyodideWorkerAPI> = {},
): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
    plotLensLayout: jest.fn().mockResolvedValue("layout"),
    getRayFanData: jest.fn().mockResolvedValue([]),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue({
      surfaceBySurface: {},
    }),
    focusByMonoRmsSpot: jest
      .fn()
      .mockResolvedValue({ delta_thi: 0.5, metric_value: 0.01 }),
    focusByMonoStrehl: jest
      .fn()
      .mockResolvedValue({ delta_thi: 0.5, metric_value: 0.02 }),
    focusByPolyRmsSpot: jest
      .fn()
      .mockResolvedValue({ delta_thi: 0.5, metric_value: 0.03 }),
    focusByPolyStrehl: jest
      .fn()
      .mockResolvedValue({ delta_thi: 0.5, metric_value: 0.04 }),
    ...overrides,
  } as unknown as PyodideWorkerAPI;
}

function setup(proxy = makeProxy()) {
  const stores = makeStores();
  const tools = new Map(
    Object.values(
      createOpticalSystemTools({
        ...stores,
        proxy,
        lookupMaps,
        selectedFieldIndex: 0,
        selectedWavelengthIndex: 0,
        selectedPlotType: "rayFan",
        isDark: false,
        imagePoint: "chief_ray",
      }),
    ).map((tool) => [tool.name, tool]),
  );
  const execute = async (
    name: string,
    input: unknown,
    signal = new AbortController().signal,
  ) => {
    const tool = tools.get(name);
    if (tool === undefined) throw new Error(`Missing tool ${name}`);
    return tool.execute(input as Record<string, unknown>, { signal });
  };
  return { stores, proxy, tools, execute };
}

describe("optical-system WebMCP tools", () => {
  it("creates recompute and focus descriptors with strict schemas", () => {
    const { tools } = setup();

    expect([...tools.keys()]).toEqual([
      "recompute_optical_system",
      "focus_optical_system",
    ]);
    expect(tools.get("recompute_optical_system")?.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
    expect(tools.get("focus_optical_system")?.description).toContain(
      "This focusing only changes the thickness of the space between the last optical surface and the image plane, so it is not suitable for all optical systems.",
    );
  });

  it("returns the complete recompute result after the commit pipeline", async () => {
    const { execute, stores } = setup();

    const result = JSON.parse(
      String(await execute("recompute_optical_system", {})),
    );

    expect(result).toEqual({
      systemUpdated: true,
      surfaceCount: 1,
      specs: stores.specsStore.getState().toOpticalSpecs(),
    });
  });

  it.each([
    ["mono", "rmsSpot", "focusByMonoRmsSpot", 0.01],
    ["mono", "wavefront", "focusByMonoStrehl", 0.02],
    ["poly", "rmsSpot", "focusByPolyRmsSpot", 0.03],
    ["poly", "wavefront", "focusByPolyStrehl", 0.04],
  ])(
    "dispatches %s/%s, mutates the final image gap, and recomputes",
    async (chromaticity, metric, method, metricValue) => {
      const { execute, proxy, stores } = setup();

      const result = JSON.parse(
        String(
          await execute("focus_optical_system", {
            chromaticity,
            metric,
            fieldIndex: 2,
          }),
        ),
      );

      expect(proxy[method as keyof PyodideWorkerAPI]).toHaveBeenCalledWith(
        expect.objectContaining({ specs: model.specs }),
        2,
      );
      expect(result).toEqual({
        delta_thi: 0.5,
        metric_value: metricValue,
        imageSpaceThickness: 5.5,
        systemUpdated: true,
      });
      expect(stores.lensStore.getState().rows[1]).toEqual(
        expect.objectContaining({ thickness: 5.5 }),
      );
      expect(stores.lensStore.getState().optimizationSyncPolicy).toBe(
        "preserveOptimizationModes",
      );
    },
  );

  it.each([
    { chromaticity: "mono", metric: "rmsSpot", fieldIndex: -1 },
    { chromaticity: "mono", metric: "rmsSpot", fieldIndex: 3 },
    { chromaticity: "bad", metric: "rmsSpot", fieldIndex: 0 },
    { chromaticity: "mono", metric: "bad", fieldIndex: 0 },
    {
      chromaticity: "mono",
      metric: "rmsSpot",
      fieldIndex: 0,
      extra: true,
    },
  ])("rejects invalid focus input before mutation", async (input) => {
    const { execute, proxy, stores } = setup();
    const before = stores.lensStore.getState().rows;

    await expect(execute("focus_optical_system", input)).rejects.toThrow(
      /input.*\//i,
    );

    expect(proxy.focusByMonoRmsSpot).not.toHaveBeenCalled();
    expect(stores.lensStore.getState().rows).toBe(before);
  });

  it("leaves the focus thickness staged when recomputation fails", async () => {
    const error = new Error("recompute failed");
    const proxy = makeProxy({
      plotLensLayout: jest.fn().mockRejectedValue(error),
    });
    const { execute, stores } = setup(proxy);
    const beforeCommitted = stores.lensStore.getState().committedOpticalModel;

    await expect(
      execute("focus_optical_system", {
        chromaticity: "mono",
        metric: "rmsSpot",
        fieldIndex: 0,
      }),
    ).rejects.toThrow("recompute failed");

    expect(stores.lensStore.getState().rows[1]).toEqual(
      expect.objectContaining({ thickness: 5.5 }),
    );
    expect(stores.lensStore.getState().committedOpticalModel).toBe(
      beforeCommitted,
    );
  });

  it("rejects cancellation before focus dispatch and mutation", async () => {
    const { execute, proxy, stores } = setup();
    const controller = new AbortController();
    controller.abort();
    const before = stores.lensStore.getState().rows;

    await expect(
      execute("recompute_optical_system", {}, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      execute(
        "focus_optical_system",
        { chromaticity: "mono", metric: "rmsSpot", fieldIndex: 0 },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(proxy.focusByMonoRmsSpot).not.toHaveBeenCalled();
    expect(stores.lensStore.getState().rows).toBe(before);
  });
});
