import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import * as echarts from "echarts/core";
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
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn().mockReturnValue("screenLG"),
}));

jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: jest.fn(() => ({
    setOption: jest.fn(),
    dispose: jest.fn(),
    resize: jest.fn(),
  })),
}));

let resizeObserverCallback: ResizeObserverCallback | undefined;
let mockResizeObserverObserve: jest.Mock;
let mockResizeObserverDisconnect: jest.Mock;

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

function mockPointerCapture(element: HTMLElement) {
  Object.defineProperty(element, "setPointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
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
  beforeEach(() => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenLG");
    mockResizeObserverObserve = jest.fn();
    mockResizeObserverDisconnect = jest.fn();
    resizeObserverCallback = undefined;
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      writable: true,
      value: MouseEvent,
    });
    class MockResizeObserver implements ResizeObserver {
      observe = mockResizeObserverObserve;
      unobserve = jest.fn();
      disconnect = mockResizeObserverDisconnect;

      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback = callback;
      }
    }
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: MockResizeObserver,
    });
  });

  it("renders the five requested tabs and action buttons", () => {
    renderOptimizationPage(makeProxy());

    expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apply to Editor" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Algorithm" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fields" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wavelengths" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Lens Prescription" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Operands" })).toBeInTheDocument();
  });

  it("updates the optimizer method in store when Levenberg-Marquardt is selected", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    const initialOptimizer = optimizationStore.getState().optimizer;
    expect(initialOptimizer.kind).toBe("least_squares");
    if (initialOptimizer.kind !== "least_squares") {
      throw new Error("Expected least-squares optimizer state.");
    }
    expect(initialOptimizer.method).toBe("trf");

    await user.selectOptions(screen.getByRole("combobox", { name: "Method" }), "lm");

    const updatedOptimizer = optimizationStore.getState().optimizer;
    expect(updatedOptimizer.kind).toBe("least_squares");
    if (updatedOptimizer.kind !== "least_squares") {
      throw new Error("Expected least-squares optimizer state.");
    }
    expect(updatedOptimizer.method).toBe("lm");
  });

  it("disables Optimize for lm when residual count is smaller than variable count", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    act(() => {
      optimizationStore.getState().setRadiusMode(1, {
        mode: "variable",
        min: "40",
        max: "60",
      });
      optimizationStore.getState().setThicknessMode(2, {
        mode: "variable",
        min: "10",
        max: "30",
      });
    });

    await user.click(screen.getByRole("tab", { name: "Algorithm" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Method" }), "lm");
    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
  });

  it("shows a warning modal when switching to lm with fewer residuals than variables", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    act(() => {
      optimizationStore.getState().setRadiusMode(1, {
        mode: "variable",
        min: "40",
        max: "60",
      });
      optimizationStore.getState().setThicknessMode(2, {
        mode: "variable",
        min: "10",
        max: "30",
      });
    });

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await user.click(screen.getByRole("tab", { name: "Algorithm" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Method" }), "lm");

    expect(await screen.findByRole("dialog", { name: "Warning" })).toBeInTheDocument();
    expect(screen.getByText("Levenberg-Marquardt requires at least as many residuals as variables.")).toBeInTheDocument();
  });

  it("shows a warning modal for any config-build error triggered by method switching", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    act(() => {
      optimizationStore.getState().replaceOperands([
        { id: "operand-1", kind: "focal_length", target: "100", weight: "0" },
      ]);
    });

    await user.selectOptions(screen.getByRole("combobox", { name: "Method" }), "lm");

    expect(await screen.findByRole("dialog", { name: "Warning" })).toBeInTheDocument();
    expect(screen.getByText("Weight must be a positive non-zero number.")).toBeInTheDocument();
  });

  it("renders the optimization tabs inside a draggable bottom drawer on large screens", () => {
    const { container } = renderOptimizationPage(makeProxy());
    const pageShell = container.firstElementChild;

    expect(pageShell).not.toHaveClass("p-4");
    expect(screen.getByTestId("optimization-shared-content-wrapper")).toHaveClass("p-4", "pb-0");
    expect(screen.getByRole("tabpanel")).toHaveClass("p-0");
    expect(screen.getByRole("separator", { name: "Resize drawer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle drawer" })).toBeInTheDocument();
    expect(screen.getByTestId("optimization-bottom-drawer-wrapper")).toHaveClass("mt-auto", "pb-4");
    expect(screen.getByTestId("optimization-bottom-drawer-wrapper")).not.toHaveClass("px-4");
  });

  it("renders the optimization tabs inside a non-draggable bottom drawer on small screens", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");

    const { container } = renderOptimizationPage(makeProxy());
    const pageShell = container.firstElementChild;

    expect(pageShell).not.toHaveClass("p-4");
    expect(screen.getByTestId("optimization-shared-content-wrapper")).toHaveClass("p-4", "pb-0");
    expect(screen.getByRole("tabpanel")).toHaveClass("p-0");
    expect(screen.getByTestId("optimization-bottom-drawer-wrapper")).toHaveClass("pb-4");
    expect(screen.getByTestId("optimization-bottom-drawer-wrapper")).not.toHaveClass("px-4");
    expect(screen.queryByRole("separator", { name: "Resize drawer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Toggle drawer" })).not.toBeInTheDocument();
  });

  it("does not render evaluation results until an operand is added", async () => {
    const proxy = makeProxy();
    renderOptimizationPage(proxy);

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).not.toHaveBeenCalled());

    expect(screen.queryByText("Paraxial focal length")).not.toBeInTheDocument();
    expect(screen.queryByText("98.5")).not.toBeInTheDocument();
  });

  it("renders the live evaluation table between the action buttons and tabs after adding an operand", async () => {
    const proxy = makeProxy();
    renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalled());

    expect(screen.getByTestId("optimization-evaluation-scroll")).toHaveClass("overflow-y-auto");
    const headers = screen.getAllByRole("columnheader");
    expect(headers.slice(0, 4).map((header) => header.textContent)).toEqual([
      "Operand Type",
      "Target",
      "Weight",
      "Value",
    ]);
    const evaluationScroll = screen.getByTestId("optimization-evaluation-scroll");
    expect(within(evaluationScroll).getByText("Paraxial focal length")).toBeInTheDocument();
    expect(within(evaluationScroll).getByText("1.000000")).toBeInTheDocument();
    expect(within(evaluationScroll).getByText("98.500000")).toBeInTheDocument();
  });

  it("renders multiple ray_fan evaluation rows and keeps zero-weight rows hidden", async () => {
    const proxy = makeProxy({
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
            kind: "ray_fan",
            value: 0.5,
            field_index: 0,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 1,
            wavelength_weight: 1,
            total_weight: 1,
            weighted_residual: 0.5,
          },
          {
            kind: "ray_fan",
            value: 0.25,
            field_index: 0,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 1,
            wavelength_weight: 1,
            total_weight: 1,
            weighted_residual: 0.25,
          },
          {
            kind: "ray_fan",
            value: 123,
            field_index: 0,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 0,
            wavelength_weight: 1,
            total_weight: 0,
            weighted_residual: 0,
          },
        ],
        merit_function: { sum_of_squares: 0.3125, rss: Math.sqrt(0.3125) },
      }),
    });
    const { optimizationStore } = renderOptimizationPage(proxy);

    act(() => {
      optimizationStore.getState().replaceOperands([
        { id: "operand-1", kind: "ray_fan", target: undefined, weight: "1" },
      ]);
    });

    expect(await screen.findAllByText("Ray Fan")).toHaveLength(2);
    expect(screen.getAllByText("N/A")).toHaveLength(2);
    expect(screen.queryByText("123.000000")).not.toBeInTheDocument();
  });

  it("filters zero-weight residuals out of the evaluation table", async () => {
    const proxy = makeProxy({
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
            kind: "rms_spot_size",
            target: 0,
            value: 0.25,
            field_index: 1,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 0,
            wavelength_weight: 1,
            total_weight: 0,
            weighted_residual: 0,
          },
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
    });
    renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalled());

    const evaluationScroll = screen.getByTestId("optimization-evaluation-scroll");
    expect(within(evaluationScroll).queryByText("RMS Spot Size")).not.toBeInTheDocument();
    expect(within(evaluationScroll).queryByText("0.250000")).not.toBeInTheDocument();
    expect(within(evaluationScroll).getByText("Paraxial focal length")).toBeInTheDocument();
    expect(within(evaluationScroll).getByText("1.000000")).toBeInTheDocument();
    expect(within(evaluationScroll).getByText("98.500000")).toBeInTheDocument();
  });

  it("shows the empty state when all returned residuals have zero effective weight", async () => {
    const proxy = makeProxy({
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
            kind: "rms_spot_size",
            target: 0,
            value: 0.25,
            field_index: 1,
            wavelength_index: 0,
            operand_weight: 1,
            field_weight: 0,
            wavelength_weight: 1,
            total_weight: 0,
            weighted_residual: 0,
          },
        ],
        merit_function: { sum_of_squares: 0, rss: 0 },
      }),
    });
    renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalled());

    expect(screen.getByText("Evaluation results appear here when the current optimization config is valid.")).toBeInTheDocument();
    expect(screen.queryByTestId("optimization-evaluation-scroll")).not.toBeInTheDocument();
  });

  it("on large screens, grows and shrinks the evaluation table when the drawer is resized", async () => {
    const proxy = makeProxy();
    const { container } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    const pageShell = container.firstElementChild as HTMLElement;
    Object.defineProperty(pageShell, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        width: 1200,
        height: 900,
        top: 0,
        left: 0,
        bottom: 900,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }),
    });

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalled());
    await waitFor(() => expect(mockResizeObserverObserve).toHaveBeenCalled());

    act(() => {
      resizeObserverCallback?.(
        [{
          target: pageShell,
          contentRect: {
            width: 1200,
            height: 900,
            top: 0,
            left: 0,
            bottom: 900,
            right: 1200,
            x: 0,
            y: 0,
            toJSON: () => undefined,
          } as DOMRectReadOnly,
        }] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );
    });

    const evaluationScroll = screen.getByTestId("optimization-evaluation-scroll");
    expect(evaluationScroll).toHaveStyle({ maxHeight: "260px" });

    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    mockPointerCapture(handle);

    fireEvent.pointerDown(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 820, pointerId: 1 });
    expect(evaluationScroll).toHaveStyle({ maxHeight: "380px" });

    fireEvent.pointerMove(handle, { clientY: 560, pointerId: 1 });
    expect(evaluationScroll).toHaveStyle({ maxHeight: "120px" });

    fireEvent.pointerUp(handle, { pointerId: 1 });
  });

  it("shows radius and thickness variable columns plus the read-only modal-backed columns in Lens Prescription", async () => {
    renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Lens Prescription" }));

    const headers = screen.getByTestId("ag-grid-mock").querySelectorAll("th");
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Index",
      "Surface",
      "Radius of Curvature",
      "Var.",
      "Thickness",
      "Var.",
      "Medium",
      "Semi-diam.",
      "Asph.",
      "Var.",
      "Tilt & Decenter",
      "Diffraction Grating",
    ]);

    expect(screen.getAllByText("Var.")).toHaveLength(3);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Semi-diam.")).toBeInTheDocument();
    expect(screen.getByText("Asph.")).toBeInTheDocument();
    expect(screen.getByText("Tilt & Decenter")).toBeInTheDocument();
    expect(screen.getByText("Diffraction Grating")).toBeInTheDocument();
  });

  it("uses autoHeight ag-grid layout for the tabular tabs without extra vertical scroll wrappers", async () => {
    renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    expect(screen.getByTestId("optimization-algorithm-tab")).not.toHaveClass("p-4");

    await user.click(screen.getByRole("tab", { name: "Fields" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-default-col-def-suppress-movable", "true");
    expect(screen.getByTestId("optimization-weights-grid")).not.toHaveClass("p-4");
    expect(screen.getByTestId("optimization-weights-grid")).not.toHaveClass("overflow-y-auto");

    await user.click(screen.getByRole("tab", { name: "Wavelengths" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-default-col-def-suppress-movable", "true");
    expect(screen.getByTestId("optimization-weights-grid")).not.toHaveClass("p-4");
    expect(screen.getByTestId("optimization-weights-grid")).not.toHaveClass("overflow-y-auto");

    await user.click(screen.getByRole("tab", { name: "Lens Prescription" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-default-col-def-suppress-movable", "true");
    expect(screen.getByTestId("optimization-lens-prescription-grid")).not.toHaveClass("p-4");
    expect(screen.getByTestId("optimization-lens-prescription-grid")).not.toHaveClass("overflow-y-auto");

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-dom-layout", "autoHeight");
    expect(screen.getByTestId("ag-grid-mock")).toHaveAttribute("data-default-col-def-suppress-movable", "true");
    expect(screen.getByTestId("optimization-operands-tab")).not.toHaveClass("p-4");
    expect(screen.getByTestId("optimization-operands-tab")).not.toHaveClass("overflow-y-auto");
  });

  it("exposes OPD Difference in the operand kind selector and resets the target when selected", async () => {
    const { optimizationStore } = renderOptimizationPage(makeProxy());
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    expect(screen.getAllByRole("option", { name: "OPD Difference" })).toHaveLength(1);

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
    await user.click(screen.getByRole("button", { name: "Add operand" }));

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

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(1));
    const inputs = screen.getAllByRole("textbox");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "125");
    await user.tab();
    await user.clear(inputs[1]);
    await user.type(inputs[1], "2.75");
    await user.tab();

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("124.250000")).toBeInTheDocument();
    expect(screen.getByText("2.750000")).toBeInTheDocument();
  });

  it("does not refresh the live evaluation table for radius edits until Done is pressed", async () => {
    jest.useFakeTimers();

    try {
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
                target: 100,
                value: 97.25,
                operand_weight: 1,
                field_weight: 1,
                wavelength_weight: 1,
                total_weight: 1,
                weighted_residual: -2.75,
              },
            ],
            merit_function: { sum_of_squares: 7.5625, rss: 2.75 },
          }),
      });
      renderOptimizationPage(proxy);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      await user.click(screen.getByRole("tab", { name: "Operands" }));
      await user.click(screen.getByRole("button", { name: "Add operand" }));
      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole("tab", { name: "Lens Prescription" }));
      await user.click(screen.getByRole("button", { name: "Radius mode for surface 1" }));
      await user.selectOptions(screen.getByRole("combobox", { name: "Radius mode" }), "variable");
      await user.clear(screen.getByRole("textbox", { name: "Min." }));
      await user.type(screen.getByRole("textbox", { name: "Min." }), "41");

      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: "Confirm" }));

      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("97.250000")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("calls optimizeOpm and updates the local optimization model on success", async () => {
    const proxy = makeProxy();
    const { optimizationStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await user.click(screen.getByRole("button", { name: "Optimize" }));

    await waitFor(() => expect(proxy.optimizeOpm).toHaveBeenCalled());
    expect(optimizationStore.getState().optimizationModel?.surfaces[0].curvatureRadius).toBe(42);
  });

  it("disables Optimize when every effective optimization weight is zero", async () => {
    const proxy = makeProxy();
    const { optimizationStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    act(() => {
      const operandId = optimizationStore.getState().operands[0].id;
      optimizationStore.getState().updateOperand(operandId, { kind: "rms_spot_size" });
      optimizationStore.getState().setFieldWeight(0, 0);
      optimizationStore.getState().setFieldWeight(1, 0);
      optimizationStore.getState().setFieldWeight(2, 0);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
    });

    expect(proxy.optimizeOpm).not.toHaveBeenCalled();
  });

  it("disables Optimize when the optimization config is invalid", async () => {
    const proxy = makeProxy();
    const { optimizationStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    act(() => {
      optimizationStore.getState().setRadiusMode(1, {
        mode: "variable",
        min: "10",
        max: "10",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Optimize" })).toBeDisabled();
    });

    expect(proxy.optimizeOpm).not.toHaveBeenCalled();
  });

  it("keeps Optimize enabled when at least one effective optimization weight is non-zero", async () => {
    const proxy = makeProxy();
    const { optimizationStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    act(() => {
      const operandId = optimizationStore.getState().operands[0].id;
      optimizationStore.getState().updateOperand(operandId, { kind: "rms_spot_size" });
      optimizationStore.getState().setFieldWeight(0, 0);
      optimizationStore.getState().setFieldWeight(1, 0);
      optimizationStore.getState().setFieldWeight(2, 1);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Optimize" })).toBeEnabled();
    });
  });

  it("shows a blocking optimization progress modal, streams chart updates, and only shows OK after completion", async () => {
    let resolveOptimization: ((value: {
      success: boolean;
      status: string;
      message: string;
      optimizer: { kind: "least_squares"; method: "trf" };
      initial_values: never[];
      final_values: { kind: "radius"; surface_index: number; value: number; min: number; max: number }[];
      pickups: never[];
      residuals: never[];
      merit_function: { sum_of_squares: number; rss: number };
      optimization_progress: { iteration: number; merit_function_value: number; log10_merit_function_value: number }[];
    }) => void) | undefined;
    const optimizationPromise = new Promise<{
      success: boolean;
      status: string;
      message: string;
      optimizer: { kind: "least_squares"; method: "trf" };
      initial_values: never[];
      final_values: { kind: "radius"; surface_index: number; value: number; min: number; max: number }[];
      pickups: never[];
      residuals: never[];
      merit_function: { sum_of_squares: number; rss: number };
      optimization_progress: { iteration: number; merit_function_value: number; log10_merit_function_value: number }[];
    }>((resolve) => {
      resolveOptimization = resolve;
    });

    const optimizeOpm = jest.fn().mockImplementation(async (_model, _config, onProgress) => {
      await onProgress?.([
        { iteration: 0, merit_function_value: 100, log10_merit_function_value: 2 },
      ]);
      await onProgress?.([
        { iteration: 0, merit_function_value: 100, log10_merit_function_value: 2 },
        { iteration: 1, merit_function_value: 10, log10_merit_function_value: 1 },
      ]);
      return await optimizationPromise;
    });

    const proxy = makeProxy({ optimizeOpm });
    const user = userEvent.setup();
    renderOptimizationPage(proxy);

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await user.click(screen.getByRole("button", { name: "Optimize" }));

    const dialog = await screen.findByRole("dialog", { name: "Optimization Progress" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "OK" })).not.toBeInTheDocument();

    const backdrop = screen.getByTestId("modal-backdrop");
    await user.click(backdrop);
    expect(screen.getByRole("dialog", { name: "Optimization Progress" })).toBeInTheDocument();

    resolveOptimization?.({
      success: true,
      status: "optimized",
      message: "done",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [],
      final_values: [{ kind: "radius", surface_index: 1, value: 42, min: 40, max: 60 }],
      pickups: [],
      residuals: [],
      merit_function: { sum_of_squares: 10, rss: 3.1622776601683795 },
      optimization_progress: [
        { iteration: 0, merit_function_value: 100, log10_merit_function_value: 2 },
        { iteration: 1, merit_function_value: 10, log10_merit_function_value: 1 },
      ],
    });

    await waitFor(() => expect(optimizeOpm).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument());

    expect(screen.getByTestId("optimization-progress-chart")).toBeInTheDocument();
    expect(echarts.init).toHaveBeenCalled();

    const chartInstance = (echarts.init as jest.Mock).mock.results.at(-1)?.value;
    expect(chartInstance.setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        yAxis: expect.objectContaining({
          type: "log",
          axisLabel: expect.objectContaining({
            formatter: expect.any(Function),
          }),
        }),
        series: [
          expect.objectContaining({
            data: [
              [0, 100],
              [1, 10],
            ],
          }),
        ],
      }),
      true,
    );

    const chartOption = (chartInstance.setOption as jest.Mock).mock.calls.at(-1)?.[0];
    const yAxis = chartOption?.yAxis as { axisLabel?: { formatter?: (value: number) => string } } | undefined;
    expect(yAxis?.axisLabel?.formatter?.(0)).toBe("1e-9");
  });

  it("floors zero merit values to the minimum non-zero plot value for the log chart", async () => {
    const optimizeOpm = jest.fn().mockResolvedValue({
      success: true,
      status: "optimized",
      message: "done",
      optimizer: { kind: "least_squares", method: "trf" },
      initial_values: [],
      final_values: [],
      pickups: [],
      residuals: [],
      merit_function: { sum_of_squares: 0, rss: 0 },
      optimization_progress: [
        { iteration: 0, merit_function_value: 0, log10_merit_function_value: -300 },
      ],
    });

    const proxy = makeProxy({ optimizeOpm });
    const user = userEvent.setup();
    renderOptimizationPage(proxy);

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await user.click(screen.getByRole("button", { name: "Optimize" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument());

    const chartInstance = (echarts.init as jest.Mock).mock.results.at(-1)?.value;
    expect(chartInstance.setOption).toHaveBeenLastCalledWith(
      expect.objectContaining({
        series: [
          expect.objectContaining({
            data: [
              [0, 1e-9],
            ],
          }),
        ],
      }),
      true,
    );
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
    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await user.click(screen.getByRole("button", { name: "Optimize" }));

    expect(await screen.findByText("bad config")).toBeInTheDocument();
    expect(optimizationStore.getState().optimizationModel?.surfaces[0].curvatureRadius).toBe(33);
  });

  it("applies an optimized image-surface radius to the page-local model", async () => {
    const proxy = makeProxy({
      optimizeOpm: jest.fn().mockResolvedValue({
        success: true,
        status: "optimized",
        message: "done",
        optimizer: { kind: "least_squares", method: "trf" },
        initial_values: [{ kind: "radius", surface_index: 3, value: 0, min: -100, max: 100 }],
        final_values: [{ kind: "radius", surface_index: 3, value: 125, min: -100, max: 100 }],
        pickups: [],
        residuals: [],
        merit_function: { sum_of_squares: 0, rss: 0 },
        optimization_progress: [],
      }),
    });
    const user = userEvent.setup();
    const { optimizationStore } = renderOptimizationPage(proxy);

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
    await user.click(screen.getByRole("button", { name: "Optimize" }));

    await waitFor(() => {
      expect(optimizationStore.getState().optimizationModel?.image.curvatureRadius).toBe(125);
    });
  });

  it("confirms Apply to Editor and overwrites the lens editor rows with the optimized model", async () => {
    const proxy = makeProxy();
    const { lensStore } = renderOptimizationPage(proxy);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));
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

  it("reseeds persisted optimization weights from the editor when the page mounts", async () => {
    const proxy = makeProxy();
    const specsStore = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
    const lensStore = createStore<LensEditorState>(createLensEditorSlice);
    const optimizationStore = createStore<OptimizationState>(createOptimizationSlice);

    specsStore.getState().loadFromSpecs(baseModel.specs);
    specsStore.getState().setCommittedSpecs(baseModel.specs);
    lensStore.getState().setRows(surfacesToGridRows(baseModel));
    lensStore.getState().setAutoAperture(false);
    lensStore.getState().setCommittedOpticalModel(baseModel);

    optimizationStore.setState({
      optimizationModel: baseModel,
      fieldWeights: [1, 1, 1],
      wavelengthWeights: [1, 1, 1],
    });

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

    render(
      <GlassCatalogContext.Provider value={glassCatalogValue}>
        <SpecsConfiguratorStoreContext.Provider value={specsStore}>
          <LensEditorStoreContext.Provider value={lensStore}>
            <OptimizationStoreContext.Provider value={optimizationStore}>
              <OptimizationPage proxy={proxy} isReady={true} onError={jest.fn()} />
            </OptimizationStoreContext.Provider>
          </LensEditorStoreContext.Provider>
        </SpecsConfiguratorStoreContext.Provider>
      </GlassCatalogContext.Provider>,
    );

    await waitFor(() => {
      expect(optimizationStore.getState().fieldWeights).toEqual([1, 0, 0]);
      expect(optimizationStore.getState().wavelengthWeights).toEqual([1, 2, 1]);
    });
  });

  it("on small screens, shows the full evaluation table without an internal vertical scrollbar", async () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    const proxy = makeProxy();
    const user = userEvent.setup();

    renderOptimizationPage(proxy);

    await user.click(screen.getByRole("tab", { name: "Operands" }));
    await user.click(screen.getByRole("button", { name: "Add operand" }));

    await waitFor(() => expect(proxy.evaluateOptimizationProblem).toHaveBeenCalled());

    const evaluationScroll = screen.getByTestId("optimization-evaluation-scroll");
    expect(evaluationScroll).not.toHaveClass("overflow-y-auto");
    expect(evaluationScroll.style.maxHeight).toBe("");
  });
});
