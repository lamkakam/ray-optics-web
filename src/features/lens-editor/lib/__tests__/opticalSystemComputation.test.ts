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
import { computeOpticalSystem } from "@/features/lens-editor/lib/opticalSystemComputation";

const model: OpticalModel = {
  setAutoAperture: "autoAperture",
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
  lensStore.getState().setAutoAperture(true);
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
    getSurfaceSemiDiameters: jest.fn().mockResolvedValue([100, 11, 200]),
    plotLensLayout: jest.fn().mockResolvedValue("layout"),
    getRayFanData: jest.fn().mockResolvedValue([]),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue({
      surfaceBySurface: {},
    }),
    ...overrides,
  } as unknown as PyodideWorkerAPI;
}

function dependencies(
  stores: ReturnType<typeof makeStores>,
  proxy: PyodideWorkerAPI,
) {
  return {
    ...stores,
    proxy,
    lookupMaps,
    selectedFieldIndex: 99,
    selectedWavelengthIndex: 99,
    selectedPlotType: "rayFan" as const,
    isDark: false,
    imagePoint: "chief_ray" as const,
  };
}

describe("computeOpticalSystem", () => {
  it("runs the complete update pipeline and commits it only after all results resolve", async () => {
    const stores = makeStores();
    const proxy = makeProxy();

    const result = await computeOpticalSystem(dependencies(stores, proxy));

    expect(proxy.getFirstOrderData).toHaveBeenCalledWith(
      expect.objectContaining({ specs: model.specs }),
    );
    expect(proxy.plotLensLayout).toHaveBeenCalledWith(
      expect.objectContaining({ specs: model.specs }),
      false,
    );
    expect(proxy.getRayFanData).toHaveBeenCalledWith(
      expect.objectContaining({ specs: model.specs }),
      2,
      "chief_ray",
      21,
    );
    expect(result).toEqual(
      expect.objectContaining({
        surfaceCount: 1,
        specs: expect.objectContaining({ field: model.specs.field }),
      }),
    );
    expect(stores.specsStore.getState().committedSpecs).toEqual(result.specs);
    expect(stores.lensStore.getState().committedOpticalModel).toEqual(
      result.model,
    );
    expect(stores.analysisDataStore.getState().firstOrderData).toEqual({
      efl: 100,
    });
    expect(stores.lensLayoutImageStore.getState().layoutImage).toBe("layout");
    expect(stores.lensStore.getState().autoSemiDiameters).toEqual({
      [stores.lensStore.getState().rows[1].id]: 11,
    });
    expect(stores.analysisPlotStore.getState().selectedFieldIndex).toBe(2);
    expect(stores.analysisPlotStore.getState().selectedWavelengthIndex).toBe(1);
  });

  it("leaves all committed state and selected indices unchanged when a worker fails", async () => {
    const stores = makeStores();
    const oldModel = { ...model, specs: { ...model.specs } };
    stores.lensStore.getState().setCommittedOpticalModel(oldModel);
    stores.specsStore.getState().setCommittedSpecs(oldModel.specs);
    const committedSpecsBefore = stores.specsStore.getState().committedSpecs;
    stores.analysisDataStore.getState().setFirstOrderData({ old: 1 });
    stores.lensLayoutImageStore.getState().setLayoutImage("old-layout");
    stores.analysisPlotStore.getState().setSelectedFieldIndex(2);
    stores.analysisPlotStore.getState().setSelectedWavelengthIndex(1);
    stores.analysisPlotStore.getState().setRayFanData([]);
    stores.lensStore.getState().setAutoSemiDiameters({ old: 9 });
    const proxy = makeProxy({
      plotLensLayout: jest.fn().mockRejectedValue(new Error("layout failed")),
    });

    await expect(
      computeOpticalSystem(dependencies(stores, proxy)),
    ).rejects.toThrow("layout failed");

    expect(stores.lensStore.getState().committedOpticalModel).toBe(oldModel);
    expect(stores.specsStore.getState().committedSpecs).toBe(
      committedSpecsBefore,
    );
    expect(stores.analysisDataStore.getState().firstOrderData).toEqual({
      old: 1,
    });
    expect(stores.lensLayoutImageStore.getState().layoutImage).toBe(
      "old-layout",
    );
    expect(stores.analysisPlotStore.getState().selectedFieldIndex).toBe(2);
    expect(stores.analysisPlotStore.getState().selectedWavelengthIndex).toBe(1);
    expect(stores.lensStore.getState().autoSemiDiameters).toEqual({ old: 9 });
  });

  it("rejects missing worker and missing glass before any commit", async () => {
    const stores = makeStores();
    await expect(
      computeOpticalSystem({
        ...dependencies(stores, undefined as unknown as PyodideWorkerAPI),
        proxy: undefined,
      }),
    ).rejects.toThrow(/Pyodide not ready/);

    stores.lensStore.getState().setRows(
      surfacesToGridRows({
        ...model,
        surfaces: [
          {
            ...model.surfaces[0],
            medium: "Unknown Glass",
            manufacturer: "Acme",
          },
        ],
      }),
    );
    const proxy = makeProxy();
    await expect(
      computeOpticalSystem(dependencies(stores, proxy)),
    ).rejects.toThrow(/Unknown glass in prescription/);
    expect(proxy.getFirstOrderData).not.toHaveBeenCalled();
  });

  it("rejects cancellation after worker results but before committing", async () => {
    const stores = makeStores();
    const controller = new AbortController();
    const proxy = makeProxy({
      plotLensLayout: jest.fn().mockImplementation(async () => {
        controller.abort();
        return "layout";
      }),
    });

    await expect(
      computeOpticalSystem({
        ...dependencies(stores, proxy),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(stores.lensStore.getState().committedOpticalModel).toBeUndefined();
  });
});

it("uses application ray-count preferences in shared Update System and WebMCP computation", async () => {
  const stores = makeStores();
  const proxy = makeProxy();
  stores.analysisPlotStore.getState().setRayCount("rayFan", 64);
  const result = await computeOpticalSystem(dependencies(stores, proxy));
  expect(proxy.getRayFanData).toHaveBeenCalledWith(
    result.model,
    2,
    "chief_ray",
    64,
  );
  expect(stores.analysisPlotStore.getState().rayCounts.rayFan).toBe(64);
  expect(result.model).not.toHaveProperty("rayCounts");
  localStorage.clear();
});

it("does not commit a superseded ray count after shared recomputation finishes", async () => {
  localStorage.clear();
  const stores = makeStores();
  let finish!: (data: never[]) => void;
  const proxy = makeProxy({
    getRayFanData: jest.fn(
      () =>
        new Promise<never[]>((resolve) => {
          finish = resolve;
        }),
    ),
  });
  const pending = computeOpticalSystem(dependencies(stores, proxy));
  stores.analysisPlotStore.getState().setRayCount("rayFan", 64);
  finish([]);
  await pending;
  expect(stores.analysisPlotStore.getState().rayFanData).toBeUndefined();
  localStorage.clear();
});
