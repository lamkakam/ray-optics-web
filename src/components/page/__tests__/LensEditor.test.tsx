import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import type { OpticalModel, SeidelData } from "@/lib/opticalModel";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/store/analysisPlotStore";
import { createLensLayoutImageSlice, type LensLayoutImageState } from "@/store/lensLayoutImageStore";
import { useScreenBreakpoint } from "@/hooks/useScreenBreakpoint";

jest.mock("@/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn().mockReturnValue("screenLG"),
}));

const testImportModel: OpticalModel = {
  setAutoAperture: "autoAperture",
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: {
    pupil: { space: "object", type: "epd", value: 77 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 1], isRelative: true },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

jest.mock("@/components/container/BottomDrawerContainer", () => ({
  BottomDrawerContainer: ({
    draggable,
    onImportJson,
    onUpdateSystem,
  }: {
    draggable: boolean;
    onImportJson: (data: OpticalModel) => void;
    onUpdateSystem: () => Promise<void>;
  }) => (
    <div data-testid="bottom-drawer-container" data-draggable={String(draggable)}>
      <button data-testid="update-system-btn" onClick={() => void onUpdateSystem()}>
        Update System
      </button>
      <button data-testid="import-json-btn" onClick={() => onImportJson(testImportModel)}>
        Import JSON
      </button>
    </div>
  ),
}));

jest.mock("@/components/container/AnalysisPlotContainer", () => ({
  AnalysisPlotContainer: () => (
    <div data-testid="analysis-plot-container-mock">Analysis Plot</div>
  ),
}));

jest.mock("@/components/composite/LensLayoutPanel", () => ({
  LensLayoutPanel: () => (
    <div data-testid="lens-layout-panel-mock">Lens Layout</div>
  ),
}));

jest.mock("@/components/composite/FirstOrderChips", () => ({
  FirstOrderChips: () => (
    <div data-testid="first-order-chips-mock">First Order Chips</div>
  ),
}));

jest.mock("@/components/composite/ConfirmOverwriteModal", () => ({
  ConfirmOverwriteModal: ({
    isOpen,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirm-overwrite-modal">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

jest.mock("@/components/composite/SeidelAberrModal", () => ({
  SeidelAberrModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    data: SeidelData;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="seidel-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock("@/components/composite/ZernikeTermsModal", () => ({
  ZernikeTermsModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="zernike-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const mockSeidelData: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["S1", "sum"],
    data: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  },
  transverse: { TSA: 0, TCO: 0, TAS: 0, SAS: 0, PTB: 0, DST: 0 },
  wavefront: { W040: 0, W131: 0, W222: 0, W220: 0, W311: 0 },
  curvature: { TCV: 0, SCV: 0, PCV: 0 },
};

function makeStores() {
  const specsStore = createStore<SpecsConfigurerState>(createSpecsConfigurerSlice);
  const lensStore = createStore<LensEditorState>(createLensEditorSlice);
  const analysisPlotStore = createStore<AnalysisPlotState>(createAnalysisPlotSlice);
  const lensLayoutImageStore = createStore<LensLayoutImageState>(createLensLayoutImageSlice);
  return { specsStore, lensStore, analysisPlotStore, lensLayoutImageStore };
}

function makeProxy(): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
    plotLensLayout: jest.fn().mockResolvedValue("layout-base64"),
    plotRayFan: jest.fn().mockResolvedValue("plot-base64"),
    plotOpdFan: jest.fn().mockResolvedValue("plot-base64"),
    plotSpotDiagram: jest.fn().mockResolvedValue("plot-base64"),
    plotSurfaceBySurface3rdOrderAberr: jest.fn().mockResolvedValue("plot-base64"),
    plotWavefrontMap: jest.fn().mockResolvedValue("plot-base64"),
    plotGeoPSF: jest.fn().mockResolvedValue("plot-base64"),
    plotDiffractionPSF: jest.fn().mockResolvedValue("plot-base64"),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue(mockSeidelData),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
  } as unknown as PyodideWorkerAPI;
}

function renderLensEditor(overrides?: {
  proxy?: PyodideWorkerAPI | undefined;
  isReady?: boolean;
  onError?: () => void;
}) {
  // Lazy import to allow mock override before render
  const { LensEditor } = require("@/components/page/LensEditor") as typeof import("@/components/page/LensEditor");
  const { specsStore, lensStore, analysisPlotStore, lensLayoutImageStore } = makeStores();
  const proxy = overrides && "proxy" in overrides ? overrides.proxy : makeProxy();
  const onError = overrides?.onError ?? jest.fn();
  render(
    <LensEditor
      specsStore={specsStore}
      lensStore={lensStore}
      analysisPlotStore={analysisPlotStore}
      lensLayoutImageStore={lensLayoutImageStore}
      proxy={proxy}
      isReady={overrides?.isReady ?? true}
      onError={onError}
    />
  );
  return { proxy, onError, specsStore, lensStore, analysisPlotStore, lensLayoutImageStore };
}

beforeEach(() => {
  jest.mocked(useScreenBreakpoint).mockReturnValue("screenLG");
});

describe("LensEditor", () => {
  it("LG smoke: renders example dropdown, LensLayoutPanel, AnalysisPlotContainer, BottomDrawerContainer", () => {
    renderLensEditor();
    expect(screen.getByRole("combobox", { name: "Example system" })).toBeInTheDocument();
    expect(screen.getByTestId("lens-layout-panel-mock")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-plot-container-mock")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-drawer-container")).toBeInTheDocument();
  });

  it("SM smoke: lens-layout-container and analysis-plot-container data-testids present", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderLensEditor();
    expect(screen.getByTestId("lens-layout-container")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-plot-container")).toBeInTheDocument();
  });

  it("ConfirmOverwriteModal is closed initially", () => {
    renderLensEditor();
    expect(screen.queryByTestId("confirm-overwrite-modal")).not.toBeInTheDocument();
  });

  it("selecting an example opens ConfirmOverwriteModal", async () => {
    renderLensEditor();
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    expect(screen.getByTestId("confirm-overwrite-modal")).toBeInTheDocument();
  });

  it("cancelling ConfirmOverwriteModal closes it", async () => {
    renderLensEditor();
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    expect(screen.getByTestId("confirm-overwrite-modal")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("confirm-overwrite-modal")).not.toBeInTheDocument();
  });

  it("confirming example calls proxy.plotLensLayout, proxy.getFirstOrderData, proxy.get3rdOrderSeidelData", async () => {
    const { proxy } = renderLensEditor();
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(proxy!.plotLensLayout).toHaveBeenCalled());
    expect(proxy!.getFirstOrderData).toHaveBeenCalled();
    expect(proxy!.get3rdOrderSeidelData).toHaveBeenCalled();
  });

  it("submit error path calls onError", async () => {
    const errorProxy = makeProxy();
    (errorProxy.plotLensLayout as jest.Mock).mockRejectedValue(new Error("compute failed"));
    const { onError } = renderLensEditor({ proxy: errorProxy });
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("Seidel button absent before submit", () => {
    renderLensEditor();
    expect(
      screen.queryByRole("button", { name: "3rd Order Seidel Aberrations" })
    ).not.toBeInTheDocument();
  });

  it("Seidel button present after successful submit", async () => {
    renderLensEditor();
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "3rd Order Seidel Aberrations" })
      ).toBeInTheDocument()
    );
  });

  it("clicking Seidel button opens SeidelAberrModal", async () => {
    renderLensEditor();
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "3rd Order Seidel Aberrations" })
      ).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "3rd Order Seidel Aberrations" }));
    expect(screen.getByTestId("seidel-modal")).toBeInTheDocument();
  });

  it("clicking Zernike button opens ZernikeTermsModal", async () => {
    renderLensEditor();
    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Example system" }),
      "1: Sasian Triplet"
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Zernike Terms" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "Zernike Terms" }));
    expect(screen.getByTestId("zernike-modal")).toBeInTheDocument();
  });

  it("LG: BottomDrawerContainer receives draggable={true}", () => {
    renderLensEditor();
    expect(screen.getByTestId("bottom-drawer-container")).toHaveAttribute(
      "data-draggable",
      "true"
    );
  });

  it("SM: BottomDrawerContainer receives draggable={false}", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderLensEditor();
    expect(screen.getByTestId("bottom-drawer-container")).toHaveAttribute(
      "data-draggable",
      "false"
    );
  });

  it("SM: first-order chips not rendered when firstOrderData is undefined", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderLensEditor();
    expect(screen.queryByTestId("first-order-chips-mock")).not.toBeInTheDocument();
  });

  it("LG: first-order chips not rendered when firstOrderData is undefined", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenLG");
    renderLensEditor();
    expect(screen.queryByTestId("first-order-chips-mock")).not.toBeInTheDocument();
  });

  it("onImportJson loads data into stores", async () => {
    const { lensStore } = renderLensEditor();
    const user = userEvent.setup();
    // testImportModel has setAutoAperture: "autoAperture"
    // default autoAperture is false, so after import it becomes true
    expect(lensStore.getState().autoAperture).toBe(false);
    await user.click(screen.getByTestId("import-json-btn"));
    expect(lensStore.getState().autoAperture).toBe(true);
  });
});
