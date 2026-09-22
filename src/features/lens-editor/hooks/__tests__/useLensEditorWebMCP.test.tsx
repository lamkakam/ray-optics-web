/** Covers all twenty-four editor tools, registration lifetime, and live worker, reference, and sampling dependencies. */
import { renderHook } from "@testing-library/react";
import { createStore } from "zustand";
import type { GlassLookupMaps } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
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
import {
  useLensEditorWebMCP,
  type LensEditorWebMCPDependencies,
} from "@/features/lens-editor/hooks/useLensEditorWebMCP";

const lookupMaps: GlassLookupMaps = {
  manufacturerMap: new Map(),
  mediumMap: new Map(),
  customMediumMap: new Map(),
};

function makeProxy(): PyodideWorkerAPI {
  return {} as PyodideWorkerAPI;
}

function makeDependencies() {
  return {
    lensStore: createStore<LensEditorState>(createLensEditorSlice),
    specsStore: createStore<SpecsConfiguratorState>(
      createSpecsConfiguratorSlice,
    ),
    analysisPlotStore: createStore<AnalysisPlotState>(createAnalysisPlotSlice),
    analysisDataStore: createStore<AnalysisDataState>(createAnalysisDataSlice),
    lensLayoutImageStore: createStore<LensLayoutImageState>(
      createLensLayoutImageSlice,
    ),
    lookupMaps,
    proxy: makeProxy(),
    isDark: false,
    imagePoint: "chief_ray" as const,
  };
}

describe("useLensEditorWebMCP", () => {
  afterEach(() => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("renders without WebMCP support", () => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
    expect(() =>
      renderHook(() => useLensEditorWebMCP(makeDependencies())),
    ).not.toThrow();
  });
  it("registers all twenty-four tools after the five prescription tools", () => {
    const registrations: WebMCP.ModelContextTool[] = [];
    const registerTool = jest.fn(
      (
        tool: WebMCP.ModelContextTool,
        _options?: WebMCP.ModelContextRegisterToolOptions,
      ) => {
        registrations.push(tool);
      },
    );
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });

    const dependencies = makeDependencies();
    const { unmount } = renderHook(() => useLensEditorWebMCP(dependencies));

    expect(registrations.map((tool) => tool.name)).toEqual([
      "get_lens_prescription",
      "set_lens_prescription",
      "insert_lens_surface",
      "update_lens_row",
      "delete_lens_surface",
      "get_system_specs",
      "set_system_aperture",
      "set_half_field",
      "set_wavelengths",
      "recompute_optical_system",
      "focus_optical_system",
      "get_paraxial_data",
      "get_3rd_order_seidel_data",
      "get_zernike_terms",
      "get_ray_fan_data",
      "get_opd_fan_data",
      "get_spot_diagram_data",
      "get_field_curvature_data",
      "get_astigmatism_data",
      "get_longitudinal_spherical_aberration_data",
      "get_strehl_vs_wavelength_data",
      "get_wavefront_map_data",
      "get_diffraction_psf_data",
      "get_diffraction_mtf_data",
    ]);
    unmount();
    expect(
      registerTool.mock.calls.every(
        (call) =>
          (call[1] as WebMCP.ModelContextRegisterToolOptions).signal
            ?.aborted === true,
      ),
    ).toBe(true);
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("updates descriptor execution inputs without unnecessary re-registration", async () => {
    const registerTool = jest.fn((tool: WebMCP.ModelContextTool) => tool);
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });
    const initial: LensEditorWebMCPDependencies = makeDependencies();
    const model: OpticalModel = {
      object: { distance: 1e10, medium: "air", manufacturer: "" },
      surfaces: [],
      image: { curvatureRadius: 0 },
      setAutoAperture: "manualAperture",
      specs: initial.specsStore.getState().toOpticalSpecs(),
    };
    initial.lensStore.getState().setCommittedOpticalModel(model);
    const getZernikeCoefficients = jest
      .fn()
      .mockRejectedValue(new Error("Current worker reached"));
    const getRayFanData = jest.fn().mockResolvedValue([]);
    const { rerender, unmount } = renderHook(
      ({ dependencies }) => useLensEditorWebMCP(dependencies),
      { initialProps: { dependencies: initial } },
    );

    rerender({
      dependencies: {
        ...initial,
        proxy: {
          getZernikeCoefficients,
          getRayFanData,
        } as unknown as PyodideWorkerAPI,
        isDark: true,
        imagePoint: "centroid",
      },
    });

    expect(registerTool).toHaveBeenCalledTimes(24);
    const zernikeTool = registerTool.mock.calls.find(
      ([tool]) => tool.name === "get_zernike_terms",
    )![0];
    await expect(
      zernikeTool.execute({}, { signal: new AbortController().signal }),
    ).rejects.toThrow("Current worker reached");
    expect(getZernikeCoefficients).toHaveBeenCalledWith(
      model,
      0,
      model.specs.wavelengths.referenceIndex,
      "centroid",
      37,
      "fringe",
      "entrance",
    );
    initial.analysisPlotStore.getState().setRayCount("rayFan", 64);
    const rayFanTool = registerTool.mock.calls.find(
      ([tool]) => tool.name === "get_ray_fan_data",
    )![0];
    expect(
      JSON.parse(
        String(
          await rayFanTool.execute(
            {},
            { signal: new AbortController().signal },
          ),
        ),
      ),
    ).toEqual({ data: [], fieldIndex: 0, imagePoint: "centroid", numRays: 64 });
    expect(getRayFanData).toHaveBeenCalledWith(model, 0, "centroid", 64);
    expect(registerTool).toHaveBeenCalledTimes(24);
    unmount();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });
});
