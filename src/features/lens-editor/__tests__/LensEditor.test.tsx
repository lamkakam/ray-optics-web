import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { DiffractionMtfData, DiffractionPsfData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import { createLensLayoutImageSlice, type LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import { createAnalysisDataSlice, type AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import { useScreenBreakpoint } from "@/shared/hooks/useScreenBreakpoint";
import { surfacesToGridRows } from "@/shared/lib/lens-prescription-grid/lib/gridTransform";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisPlotStoreContext } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreContext } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreContext } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { useTheme } from "@/shared/components/providers/ThemeProvider";

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: jest.fn().mockReturnValue("screenLG"),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn().mockReturnValue({ theme: "light", setTheme: jest.fn() }),
}));

const testImportModel: OpticalModel = {
  setAutoAperture: "autoAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: {
    pupil: { space: "object", type: "epd", value: 77 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 1], isRelative: true },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

const testImportModelWithDiffractionGrating: OpticalModel = {
  ...testImportModel,
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 50,
      thickness: 5,
      medium: "air",
      manufacturer: "",
      semiDiameter: 10,
      diffractionGrating: { lpmm: 1200, order: 1 },
    },
  ],
};

jest.mock("@/features/lens-editor/components/BottomDrawerContainer", () => ({
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

jest.mock("@/features/analysis/components", () => ({
  AnalysisPlotContainer: () => (
    <div data-testid="analysis-plot-container-mock">Analysis Plot</div>
  ),
}));

jest.mock("@/features/lens-editor/components/LensLayoutPanel", () => ({
  LensLayoutPanel: () => (
    <div data-testid="lens-layout-panel-mock">Lens Layout</div>
  ),
}));

jest.mock("@/features/lens-editor/components/FirstOrderChips", () => ({
  FirstOrderChips: () => (
    <div data-testid="first-order-chips-mock">First Order Chips</div>
  ),
}));

jest.mock("@/features/lens-editor/components/ConfirmOverwriteModal", () => ({
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

jest.mock("@/features/lens-editor/components/SeidelAberrModal", () => ({
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

jest.mock("@/features/lens-editor/components/ZernikeTermsModal", () => ({
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

const mockWavefrontMapData: WavefrontMapData = {
  fieldIdx: 0,
  wvlIdx: 0,
  x: [-1, 0, 1],
  y: [-1, 0, 1],
  z: [
    [undefined, 0.1, undefined],
    [0.2, 0.3, 0.4],
    [undefined, 0.5, undefined],
  ],
  unitX: "",
  unitY: "",
  unitZ: "waves",
};

const mockDiffractionPsfData: DiffractionPsfData = {
  fieldIdx: 0,
  wvlIdx: 0,
  x: [-0.02, 0, 0.02],
  y: [-0.02, 0, 0.02],
  z: [
    [0.001, 0.01, 0.001],
    [0.01, 1, 0.01],
    [0.001, 0.01, 0.001],
  ],
  unitX: "mm",
  unitY: "mm",
  unitZ: "",
};

const mockDiffractionMtfData: DiffractionMtfData = {
  fieldIdx: 0,
  wvlIdx: 0,
  Tangential: { x: [0, 10, 20], y: [1, 0.7, 0.2] },
  Sagittal: { x: [0, 10, 20], y: [1, 0.65, 0.15] },
  IdealTangential: { x: [0, 10, 20], y: [1, 0.8, 0.3] },
  IdealSagittal: { x: [0, 10, 20], y: [1, 0.78, 0.28] },
  unitX: "cycles/mm",
  unitY: "",
  cutoffTangential: 42,
  cutoffSagittal: 40,
  naTangential: 0.012,
  naSagittal: 0.011,
};

function makeStores() {
  const specsStore = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  const lensStore = createStore<LensEditorState>(createLensEditorSlice);
  const analysisPlotStore = createStore<AnalysisPlotState>(createAnalysisPlotSlice);
  const lensLayoutImageStore = createStore<LensLayoutImageState>(createLensLayoutImageSlice);
  const analysisDataStore = createStore<AnalysisDataState>(createAnalysisDataSlice);
  return { specsStore, lensStore, analysisPlotStore, lensLayoutImageStore, analysisDataStore };
}

function makeProxy(): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
    plotLensLayout: jest.fn().mockResolvedValue("layout-base64"),
    plotRayFan: jest.fn().mockResolvedValue("plot-base64"),
    getRayFanData: jest.fn().mockResolvedValue([
      {
        fieldIdx: 0,
        wvlIdx: 0,
        Sagittal: {
          x: [-1, 0, 1],
          y: [-0.2, 0, 0.2],
        },
        Tangential: {
          x: [-1, 0, 1],
          y: [-0.1, 0, 0.1],
        },
        unitX: "",
        unitY: "mm",
      },
    ]),
    plotOpdFan: jest.fn().mockResolvedValue("plot-base64"),
    getOpdFanData: jest.fn().mockResolvedValue([]),
    plotSpotDiagram: jest.fn().mockResolvedValue("plot-base64"),
    plotSurfaceBySurface3rdOrderAberr: jest.fn().mockResolvedValue("plot-base64"),
    plotWavefrontMap: jest.fn().mockResolvedValue("plot-base64"),
    getWavefrontData: jest.fn().mockResolvedValue(mockWavefrontMapData),
    getGeoPSFData: jest.fn().mockResolvedValue({
      fieldIdx: 0,
      wvlIdx: 0,
      x: [0],
      y: [0],
      unitX: "mm",
      unitY: "mm",
    }),
    plotGeoPSF: jest.fn().mockResolvedValue("plot-base64"),
    plotDiffractionPSF: jest.fn().mockResolvedValue("plot-base64"),
    getDiffractionPSFData: jest.fn().mockResolvedValue(mockDiffractionPsfData),
    getDiffractionMTFData: jest.fn().mockResolvedValue(mockDiffractionMtfData),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue(mockSeidelData),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    getAllGlassCatalogsData: jest.fn(),
  } as unknown as PyodideWorkerAPI;
}

function renderLensEditor(overrides?: {
  proxy?: PyodideWorkerAPI | undefined;
  isReady?: boolean;
  onError?: () => void;
}) {
  // Lazy import to allow mock override before render
  const { LensEditor } = require("@/features/lens-editor/LensEditor") as typeof import("@/features/lens-editor/LensEditor");
  const { specsStore, lensStore, analysisPlotStore, lensLayoutImageStore, analysisDataStore } = makeStores();
  const proxy = overrides && "proxy" in overrides ? overrides.proxy : makeProxy();
  const onError = overrides?.onError ?? jest.fn();
  const renderResult = render(
    <SpecsConfiguratorStoreContext.Provider value={specsStore}>
      <LensEditorStoreContext.Provider value={lensStore}>
        <AnalysisPlotStoreContext.Provider value={analysisPlotStore}>
          <AnalysisDataStoreContext value={analysisDataStore}>
            <LensLayoutImageStoreContext value={lensLayoutImageStore}>
              <LensEditor
                proxy={proxy}
                isReady={overrides?.isReady ?? true}
                onError={onError}
              />
            </LensLayoutImageStoreContext>
          </AnalysisDataStoreContext>
        </AnalysisPlotStoreContext.Provider>
      </LensEditorStoreContext.Provider>
    </SpecsConfiguratorStoreContext.Provider>
  );
  return { ...renderResult, proxy, onError, specsStore, lensStore, analysisPlotStore, lensLayoutImageStore, analysisDataStore };
}

beforeEach(() => {
  jest.mocked(useScreenBreakpoint).mockReturnValue("screenLG");
  jest.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: jest.fn() });
});

describe("LensEditor", () => {
  it("LG smoke: renders LensLayoutPanel, AnalysisPlotContainer, BottomDrawerContainer without the old example dropdown", () => {
    renderLensEditor();
    expect(screen.queryByRole("combobox", { name: "Example system" })).not.toBeInTheDocument();
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

  it("SM: scroll container has overflow-y-auto so content is scrollable on small screens", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderLensEditor();
    const wrapper = screen.getByTestId("sm-scroll-container");
    expect(wrapper).toHaveClass("overflow-y-auto");
  });

  it("Update System passes isDark=true to plotLensLayout when the theme is dark", async () => {
    jest.mocked(useTheme).mockReturnValue({ theme: "dark", setTheme: jest.fn() });
    const { proxy } = renderLensEditor();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      expect(proxy!.plotLensLayout).toHaveBeenCalledWith(expect.anything(), true);
    });
  });

  it("Update System passes isDark=false and preserves diffraction grating data in the submitted model when the theme is light", async () => {
    const { proxy, lensStore } = renderLensEditor();
    act(() => {
      lensStore.getState().setRows(surfacesToGridRows(testImportModelWithDiffractionGrating));
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      expect(proxy!.plotLensLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          surfaces: expect.arrayContaining([
            expect.objectContaining({
              diffractionGrating: { lpmm: 1200, order: 1 },
            }),
          ]),
        }),
        false,
      );
    });
  });

  it("Update System uses getWavefrontData instead of requesting a wavefront PNG", async () => {
    const { proxy, analysisPlotStore } = renderLensEditor();
    act(() => {
      analysisPlotStore.getState().setSelectedPlotType("wavefrontMap");
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      expect(proxy!.getWavefrontData).toHaveBeenCalled();
    });
    expect(proxy!.plotWavefrontMap).not.toHaveBeenCalled();
    expect(analysisPlotStore.getState().wavefrontMapData).toEqual(mockWavefrontMapData);
  });

  it("Update System uses getDiffractionPSFData instead of requesting a diffraction PNG", async () => {
    const { proxy, analysisPlotStore } = renderLensEditor();
    act(() => {
      analysisPlotStore.getState().setSelectedPlotType("diffractionPSF");
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      expect(proxy!.getDiffractionPSFData).toHaveBeenCalled();
    });
    expect(proxy!.plotDiffractionPSF).not.toHaveBeenCalled();
    expect(analysisPlotStore.getState().diffractionPsfData).toEqual(mockDiffractionPsfData);
  });

  it("Update System commits diffraction MTF data for the selected plot", async () => {
    const { proxy, analysisPlotStore } = renderLensEditor();
    act(() => {
      analysisPlotStore.getState().setSelectedPlotType("diffractionMTF");
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      expect(proxy!.getDiffractionMTFData).toHaveBeenCalledWith(expect.anything(), 0, 0);
    });
    expect(analysisPlotStore.getState().diffractionMtfData).toEqual(mockDiffractionMtfData);
  });

  it("submit error path calls onError", async () => {
    const errorProxy = makeProxy();
    (errorProxy.plotLensLayout as jest.Mock).mockRejectedValue(new Error("compute failed"));
    const { onError } = renderLensEditor({ proxy: errorProxy });
    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));
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
    await user.click(screen.getByTestId("update-system-btn"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "3rd Order Seidel Aberrations" })
      ).toBeInTheDocument()
    );
  });

  it("clicking Seidel button opens SeidelAberrModal", async () => {
    renderLensEditor();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));
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
    await user.click(screen.getByTestId("update-system-btn"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Zernike Terms" })).toBeInTheDocument()
    );
    await user.click(screen.getByRole("button", { name: "Zernike Terms" }));
    expect(screen.getByTestId("zernike-modal")).toBeInTheDocument();
  });

  it("LG: analysis plot panel has overflow-hidden to prevent content bleeding over BottomDrawer", () => {
    renderLensEditor();
    const panel = screen.getByTestId("lg-analysis-plot-panel");
    expect(panel).toHaveClass("overflow-hidden");
  });

  it("LG: initial render omits the empty controls row under the header", () => {
    const { container } = renderLensEditor();
    const firstSection = container.firstElementChild;
    expect(firstSection).toContainElement(screen.getByTestId("lens-layout-panel-mock"));
    expect(firstSection).toContainElement(screen.getByTestId("lg-analysis-plot-panel"));
  });

  it("SM: initial render omits the empty controls section under the header", () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderLensEditor();
    const scrollContainer = screen.getByTestId("sm-scroll-container");
    expect(scrollContainer.firstElementChild).toBe(screen.getByTestId("lens-layout-container"));
  });

  it("LG: controls render after successful submit with buttons and first-order chips", async () => {
    const { container } = renderLensEditor();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      const firstSection = container.firstElementChild;
      expect(firstSection).toContainElement(
        screen.getByRole("button", { name: "3rd Order Seidel Aberrations" }),
      );
      expect(firstSection).toContainElement(screen.getByRole("button", { name: "Zernike Terms" }));
      expect(screen.getByTestId("first-order-chips-mock")).toBeInTheDocument();
    });
  });

  it("SM: controls render after successful submit with buttons and first-order chips", async () => {
    jest.mocked(useScreenBreakpoint).mockReturnValue("screenSM");
    renderLensEditor();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("update-system-btn"));

    await waitFor(() => {
      const scrollContainer = screen.getByTestId("sm-scroll-container");
      const controlsSection = scrollContainer.firstElementChild;
      expect(controlsSection).toContainElement(
        screen.getByRole("button", { name: "3rd Order Seidel Aberrations" }),
      );
      expect(controlsSection).toContainElement(screen.getByRole("button", { name: "Zernike Terms" }));
      expect(controlsSection).toContainElement(screen.getByTestId("first-order-chips-mock"));
    });
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

  it("Zernike button absent before any commit", () => {
    renderLensEditor();
    expect(
      screen.queryByRole("button", { name: "Zernike Terms" })
    ).not.toBeInTheDocument();
  });

  it("Zernike button present when committedOpticalModel is set even without seidelData", () => {
    const { lensStore } = renderLensEditor();
    act(() => {
      lensStore.getState().setCommittedOpticalModel(testImportModel);
    });
    // Zernike button should appear — it only requires a committed model
    expect(screen.getByRole("button", { name: "Zernike Terms" })).toBeInTheDocument();
    // Seidel button must NOT appear — it legitimately depends on seidelData
    expect(
      screen.queryByRole("button", { name: "3rd Order Seidel Aberrations" })
    ).not.toBeInTheDocument();
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
