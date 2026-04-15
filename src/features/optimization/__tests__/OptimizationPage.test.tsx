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
    evaluateOptimizationProblem: jest.fn().mockResolvedValue({
      success: true,
      status: "evaluated",
      message: "ok",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [],
      final_values: [],
      pickups: [],
      residuals: [
        {
          kind: "focal_length",
          target: 100,
          value: 98.5,
          operand_weight: 1,
          field_weight: 1,
          wavelength_weight: 1,
          total_weight: 1,
          weighted_residual: -1.5,
        },
      ],
      merit_function: { sum_of_squares: 2.25, rss: 1.5 },
    }),
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

  it("renders the live evaluation table between the action buttons and tabs", async () => {
    const proxy = makeProxy();
    renderOptimizationPage(proxy);

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalled());

    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveClass("max-h-64", "overflow-y-auto");
    const headers = screen.getAllByRole("columnheader");
    expect(headers.slice(0, 4).map((header) => header.textContent)).toEqual([
      "Operand Type",
      "Target",
      "Weight",
      "Value",
    ]);
    expect(screen.getByText("Paraxial focal length")).toBeInTheDocument();
    expect(screen.getByText("98.5")).toBeInTheDocument();
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

  it("exposes OPD Difference in the operand kind selector and resets the target when selected", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));

    expect(screen.getByRole("option", { name: "OPD Difference" })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Operand Kind" }), "opd_difference");

    expect(optimizationStore.getState().operands[0]).toMatchObject({
      kind: "opd_difference",
      target: "0",
    });
  });

  it("renders the operand weight column after target and updates the row weight when edited", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Operand Kind",
      "Target",
      "Weight",
      "",
    ]);

    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "2.75");
    await user.tab();

    expect(optimizationStore.getState().operands[0]).toMatchObject({
      weight: "2.75",
    });
  });

  it("refreshes the live evaluation table when the optimization config changes", async () => {
    const proxy = makeProxy({
      evaluateOptimizationProblem: jest
        .fn()
        .mockResolvedValueOnce({
          success: true,
          status: "evaluated",
          message: "ok",
          optimizer: { kind: "least_squares", method: "trf" },
          initial_values: [],
          final_values: [],
          pickups: [],
          residuals: [
            {
              kind: "focal_length",
              target: 100,
              value: 98.5,
              operand_weight: 1,
              field_weight: 1,
              wavelength_weight: 1,
              total_weight: 1,
              weighted_residual: -1.5,
            },
          ],
          merit_function: { sum_of_squares: 2.25, rss: 1.5 },
        })
        .mockResolvedValueOnce({
          success: true,
          status: "evaluated",
          message: "ok",
          optimizer: { kind: "least_squares", method: "trf" },
          initial_values: [],
          final_values: [],
          pickups: [],
          residuals: [
            {
              kind: "focal_length",
              target: 125,
              value: 124.25,
              operand_weight: 2.75,
              field_weight: 1,
              wavelength_weight: 1,
              total_weight: 2.75,
              weighted_residual: -2.0625,
            },
          ],
          merit_function: { sum_of_squares: 4.25390625, rss: 2.0625 },
        }),
    });
    renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "125");
    await user.tab();
    await user.clear(inputs[1]);
    await user.type(inputs[1], "2.75");
    await user.tab();

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("124.25")).toBeInTheDocument();
    expect(screen.getByText("2.75")).toBeInTheDocument();
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
