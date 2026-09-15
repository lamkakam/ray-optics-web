import { renderHook } from "@testing-library/react";
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
import { useLensEditorWebMCP } from "@/features/lens-editor/hooks/useLensEditorWebMCP";

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
  it("registers all eleven tools after the five prescription tools", () => {
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

  it("updates descriptor execution inputs without unnecessary re-registration", () => {
    const registerTool = jest.fn((tool: WebMCP.ModelContextTool) => tool);
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });
    const initial = makeDependencies();
    const { rerender, unmount } = renderHook(
      ({ dependencies }) => useLensEditorWebMCP(dependencies),
      { initialProps: { dependencies: initial } },
    );

    rerender({
      dependencies: {
        ...initial,
        proxy: makeProxy(),
        isDark: true,
      },
    });

    expect(registerTool).toHaveBeenCalledTimes(11);
    unmount();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
  });
});
