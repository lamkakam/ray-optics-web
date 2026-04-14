import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { OptimizationStoreContext } from "@/features/optimization/providers/OptimizationStoreProvider";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { createOptimizationSlice, type OptimizationState } from "@/features/optimization/stores/optimizationStore";
import { surfacesToGridRows } from "@/shared/lib/utils/gridTransform";
import { GlassCatalogContext, type GlassCatalogContextValue } from "@/shared/components/providers/GlassCatalogProvider";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

const baseModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
    {
      label: "Stop",
      curvatureRadius: -40,
      thickness: 20,
      medium: "air",
      manufacturer: "",
      semiDiameter: 9,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
    wavelengths: { weights: [[486.133, 1], [587.562, 2], [656.273, 1]], referenceIndex: 1 },
  },
};

function makeProxy(overrides?: Partial<PyodideWorkerAPI>): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    plotRayFan: jest.fn(),
    getRayFanData: jest.fn(),
    plotOpdFan: jest.fn(),
    getOpdFanData: jest.fn(),
    plotSpotDiagram: jest.fn(),
    getSpotDiagramData: jest.fn(),
    plotSurfaceBySurface3rdOrderAberr: jest.fn(),
    plotWavefrontMap: jest.fn(),
    getWavefrontData: jest.fn(),
    getGeoPSFData: jest.fn(),
    plotGeoPSF: jest.fn(),
    plotDiffractionPSF: jest.fn(),
    getDiffractionPSFData: jest.fn(),
    get3rdOrderSeidelData: jest.fn(),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    getAllGlassCatalogsData: jest.fn(),
    optimizeOpm: jest.fn().mockResolvedValue({
      success: true,
      status: "optimized",
      message: "done",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [],
      final_values: [{ kind: "radius", surface_index: 1, value: 42, min: 40, max: 60 }],
      pickups: [],
      residuals: [],
      merit_function: { sum_of_squares: 0, rss: 0 },
    }),
    ...overrides,
  } as unknown as PyodideWorkerAPI;
}

function renderOptimizationPage(proxy: PyodideWorkerAPI, onError = jest.fn()) {
  const specsStore = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  const lensStore = createStore<LensEditorState>(createLensEditorSlice);
  const optimizationStore = createStore<OptimizationState>(createOptimizationSlice);

  specsStore.getState().loadFromSpecs(baseModel.specs);
  specsStore.getState().setCommittedSpecs(baseModel.specs);
  lensStore.getState().setRows(surfacesToGridRows(baseModel));
  lensStore.getState().setAutoAperture(false);
  lensStore.getState().setCommittedOpticalModel(baseModel);

  const { OptimizationPage } = require("@/features/optimization/OptimizationPage") as typeof import("@/features/optimization/OptimizationPage");

  const glassCatalogValue: GlassCatalogContextValue = {
    catalogs: {
      CDGM: {},
      Hikari: {},
      Hoya: {},
      Ohara: {},
      Schott: {},
      Sumita: {},
      Special: {},
    },
    error: undefined,
    isLoaded: true,
    isLoading: false,
    preload: jest.fn(),
  };

  const rendered = render(
    <GlassCatalogContext.Provider value={glassCatalogValue}>
      <SpecsConfiguratorStoreContext.Provider value={specsStore}>
        <LensEditorStoreContext.Provider value={lensStore}>
          <OptimizationStoreContext.Provider value={optimizationStore}>
            <OptimizationPage proxy={proxy} isReady={true} onError={onError} />
          </OptimizationStoreContext.Provider>
        </LensEditorStoreContext.Provider>
      </SpecsConfiguratorStoreContext.Provider>
    </GlassCatalogContext.Provider>,
  );

  return { ...rendered, specsStore, lensStore, optimizationStore };
}

describe("OptimizationPage", () => {
  it("renders the five requested tabs and action buttons", () => {
    renderOptimizationPage(makeProxy());

    expect(screen.getByRole("button", { name: "Optimize" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Algorithm" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fields" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wavelengths" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Lens Prescription" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Operands" })).toBeInTheDocument();
  });

  it("shows radius and thickness variable columns plus the read-only modal-backed columns in Lens Prescription", async () => {
    renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Lens Prescription" }));

    expect(screen.getAllByText("Var.")).toHaveLength(2);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Semi-diam.")).toBeInTheDocument();
    expect(screen.getByText("Asph.")).toBeInTheDocument();
    expect(screen.getByText("Tilt & Decenter")).toBeInTheDocument();
    expect(screen.getByText("Diffraction Grating")).toBeInTheDocument();
  });

  it("uses autoHeight ag-grid layout for the tabular tabs", async () => {
    renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Fields" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");

    await user.click(screen.getByRole("tab", { name: "Wavelengths" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");

    await user.click(screen.getByRole("tab", { name: "Lens Prescription" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");
  });

  it("exposes OPD in the operand kind selector and resets the target when selected", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));

    expect(screen.getByRole("option", { name: "OPD" })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Operand Kind" }), "opd");

    expect(optimizationStore.getState().operands[0]).toMatchObject({
      kind: "opd",
      target: "0",
    });
  });

  it("calls optimizeOpm and updates the local optimization model on success", async () => {
    const proxy = makeProxy();
    const { optimizationStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Optimize" }));

    await waitFor(() => expect(proxy.optimizeOpm).toHaveBeenCalled());
    expect(optimizationStore.getState().optimizationModel?.surfaces[0].curvatureRadius).toBe(42);
  });

  it("applies the returned result and still shows a warning modal when optimizeOpm returns a failed status", async () => {
    const proxy = makeProxy({
      optimizeOpm: jest.fn().mockResolvedValue({
        success: false,
        status: "failed",
        message: "bad config",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [],
        final_values: [{ kind: "radius", surface_index: 1, value: 33, min: 20, max: 40 }],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
      }),
    });
    const user = userEvent.setup();

    const { optimizationStore } = renderOptimizationPage(proxy);
    await user.click(screen.getByRole("button", { name: "Optimize" }));

    expect(await screen.findByText("bad config")).toBeInTheDocument();
    expect(optimizationStore.getState().optimizationModel?.surfaces[0].curvatureRadius).toBe(33);
  });

  it("confirms Apply to Editor and overwrites the lens editor rows with the optimized model", async () => {
    const proxy = makeProxy();
    const { lensStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Optimize" }));
    await waitFor(() => expect(proxy.optimizeOpm).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));
    expect(screen.getByText(/overwrite the lens prescription/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(lensStore.getState().rows[1]).toMatchObject({ curvatureRadius: 42 });
  });

  it("tracks live lens-editor changes after the optimization page has mounted", async () => {
    const { lensStore, optimizationStore } = renderOptimizationPage(makeProxy());

    await waitFor(() =>
      expect(optimizationStore.getState().optimizationModel?.surfaces[0].curvatureRadius).toBe(50),
    );

    act(() => {
      lensStore.getState().updateRow(lensStore.getState().rows[1].id, {
        curvatureRadius: 88,
      });
    });

    await waitFor(() =>
      expect(optimizationStore.getState().optimizationModel?.surfaces[0].curvatureRadius).toBe(88),
    );
  });
});
