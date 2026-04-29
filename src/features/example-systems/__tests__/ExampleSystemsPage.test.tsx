import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import { createAnalysisDataSlice, type AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import { createLensLayoutImageSlice, type LensLayoutImageState } from "@/features/analysis/stores/lensLayoutImageStore";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { AnalysisPlotStoreContext } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreContext } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreContext } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { ExampleSystemsPage } from "@/features/example-systems/ExampleSystemsPage";
import type { ScreenSize } from "@/shared/hooks/useScreenBreakpoint";

const mockPush = jest.fn<void, [string]>();
let mockScreenBreakpoint: ScreenSize = "screenLG";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => mockScreenBreakpoint,
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

function makeProxy(): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
    plotLensLayout: jest.fn().mockResolvedValue("layout-base64"),
    plotRayFan: jest.fn(),
    getRayFanData: jest.fn().mockResolvedValue([]),
    plotOpdFan: jest.fn(),
    getOpdFanData: jest.fn().mockResolvedValue([]),
    plotSpotDiagram: jest.fn(),
    getSpotDiagramData: jest.fn().mockResolvedValue([]),
    plotSurfaceBySurface3rdOrderAberr: jest.fn(),
    plotWavefrontMap: jest.fn(),
    getWavefrontData: jest.fn().mockResolvedValue({ fieldIdx: 0, wvlIdx: 0, x: [], y: [], z: [], unitX: "", unitY: "", unitZ: "" }),
    getGeoPSFData: jest.fn().mockResolvedValue({ fieldIdx: 0, wvlIdx: 0, x: [], y: [], unitX: "", unitY: "" }),
    plotGeoPSF: jest.fn(),
    plotDiffractionPSF: jest.fn(),
    getDiffractionPSFData: jest.fn().mockResolvedValue({ fieldIdx: 0, wvlIdx: 0, x: [], y: [], z: [], unitX: "", unitY: "", unitZ: "" }),
    get3rdOrderSeidelData: jest.fn().mockResolvedValue(mockSeidelData),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    getAllGlassCatalogsData: jest.fn(),
  } as unknown as PyodideWorkerAPI;
}

function renderPage(overrides?: {
  readonly proxy?: PyodideWorkerAPI;
  readonly onError?: () => void;
  readonly screenSize?: ScreenSize;
}) {
  const lensStore = createStore<LensEditorState>(createLensEditorSlice);
  const specsStore = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  const analysisPlotStore = createStore<AnalysisPlotState>(createAnalysisPlotSlice);
  const analysisDataStore = createStore<AnalysisDataState>(createAnalysisDataSlice);
  const lensLayoutImageStore = createStore<LensLayoutImageState>(createLensLayoutImageSlice);
  const proxy = overrides?.proxy ?? makeProxy();
  const onError = overrides?.onError ?? jest.fn();
  mockScreenBreakpoint = overrides?.screenSize ?? "screenLG";

  render(
    <SpecsConfiguratorStoreContext.Provider value={specsStore}>
      <LensEditorStoreContext.Provider value={lensStore}>
        <AnalysisPlotStoreContext.Provider value={analysisPlotStore}>
          <AnalysisDataStoreContext value={analysisDataStore}>
            <LensLayoutImageStoreContext value={lensLayoutImageStore}>
              <ExampleSystemsPage proxy={proxy} onError={onError} />
            </LensLayoutImageStoreContext>
          </AnalysisDataStoreContext>
        </AnalysisPlotStoreContext.Provider>
      </LensEditorStoreContext.Provider>
    </SpecsConfiguratorStoreContext.Provider>,
  );

  return { proxy, onError, lensStore, specsStore, analysisDataStore };
}

describe("ExampleSystemsPage", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockScreenBreakpoint = "screenLG";
  });

  it("renders example names without numeric prefixes and keeps only one selected item", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Sasian Triplet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1: Sasian Triplet" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sasian Triplet" }));
    await user.click(screen.getByRole("button", { name: "Schmidt Camera 200mm f/5" }));

    expect(screen.getByRole("button", { name: "Sasian Triplet" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Schmidt Camera 200mm f/5" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens and closes the overwrite confirmation from Apply", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Sasian Triplet" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("dialog", { name: "Load Example System" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Load Example System" })).not.toBeInTheDocument();
  });

  it("keeps the large-screen two-column viewport layout with Apply above the description", () => {
    renderPage({ screenSize: "screenLG" });

    const menu = screen.getByLabelText("Example systems");
    const layout = menu.parentElement;
    const description = screen.getByTestId("description-container");
    const rightColumn = description.parentElement;
    const apply = screen.getByRole("button", { name: "Apply" });

    expect(layout).toHaveClass("grid");
    expect(layout).toHaveClass("grid-cols-[minmax(0,calc(50vw-1.5rem))_minmax(0,calc(50vw-1.5rem))]");
    expect(menu).toHaveClass("w-[calc(50vw-1.5rem)]");
    expect(menu).toHaveClass("h-[calc(100dvh-8rem)]");
    expect(menu).toHaveClass("!max-h-[calc(100dvh-8rem)]");
    expect(description).toHaveClass("w-[calc(50vw-1.5rem)]");
    expect(description).toHaveClass("h-[50dvh]");
    expect(rightColumn?.firstElementChild).toContainElement(apply);
    expect(rightColumn?.lastElementChild).toBe(description);
  });

  it("places Apply in the heading row on small screens", () => {
    renderPage({ screenSize: "screenSM" });

    const heading = screen.getByRole("heading", { name: "Example Systems" });
    const headingRow = heading.parentElement;
    const apply = screen.getByRole("button", { name: "Apply" });

    expect(headingRow).toHaveClass("flex");
    expect(headingRow).toHaveClass("items-center");
    expect(headingRow).toHaveClass("justify-between");
    expect(headingRow).toContainElement(apply);
  });

  it("stacks full-width menu before description with split-height panels on small screens", () => {
    renderPage({ screenSize: "screenSM" });

    const menu = screen.getByLabelText("Example systems");
    const description = screen.getByTestId("description-container");
    const layout = menu.parentElement;

    expect(layout).toHaveClass("flex");
    expect(layout).toHaveClass("flex-col");
    expect(layout?.firstElementChild).toBe(menu);
    expect(layout?.lastElementChild).toBe(description);
    expect(menu).toHaveClass("w-full");
    expect(menu).toHaveClass("min-h-0");
    expect(menu).toHaveClass("flex-1");
    expect(menu).toHaveClass("overflow-y-auto");
    expect(description).toHaveClass("w-full");
    expect(description).toHaveClass("min-h-0");
    expect(description).toHaveClass("flex-1");
    expect(description).toHaveClass("overflow-y-auto");
    expect(menu.className).not.toContain("50vw");
    expect(description.className).not.toContain("50vw");
  });

  it("contains small-screen vertical overflow inside the page panels", () => {
    renderPage({ screenSize: "screenSM" });

    const menu = screen.getByLabelText("Example systems");
    const page = menu.parentElement?.parentElement;

    expect(page).toHaveClass("flex-1");
    expect(page).toHaveClass("min-h-0");
    expect(page).toHaveClass("overflow-hidden");
  });

  it("confirming applies the model, computes data, and routes to the Lens Editor", async () => {
    const { proxy, lensStore, specsStore, analysisDataStore } = renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sasian Triplet" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Load" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    expect(proxy.getFirstOrderData).toHaveBeenCalledWith(expect.objectContaining<Partial<OpticalModel>>({ setAutoAperture: "autoAperture" }));
    expect(proxy.plotLensLayout).toHaveBeenCalled();
    expect(proxy.get3rdOrderSeidelData).toHaveBeenCalled();
    expect(lensStore.getState().autoAperture).toBe(true);
    expect(specsStore.getState().committedSpecs.pupil.value).toBe(12.5);
    expect(analysisDataStore.getState().firstOrderData).toEqual({ efl: 100 });
  });

  it("shows the app error modal hook and stays on the route when apply fails", async () => {
    const proxy = makeProxy();
    (proxy.plotLensLayout as jest.Mock).mockRejectedValue(new Error("failed"));
    const onError = jest.fn();
    renderPage({ proxy, onError });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sasian Triplet" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Load" }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
