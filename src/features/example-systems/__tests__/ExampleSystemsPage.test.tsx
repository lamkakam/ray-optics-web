import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { componentTokens as cx } from "@/shared/tokens/styleTokens";
import { ExampleSystemList } from "@/shared/lib/data/exampleSystems";
import * as exampleSystemsData from "@/shared/lib/data/exampleSystems";

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

  it("uses the unprefixed example catalogue directly", () => {
    renderPage();

    expect(exampleSystemsData).not.toHaveProperty("ExampleSystems");
    Object.keys(ExampleSystemList).forEach((name, index) => {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
      expect(screen.queryByText(`${index + 1}: ${name}`)).not.toBeInTheDocument();
    });
  });

  it("keeps only one selected item", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Sasian Triplet" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sasian Triplet" }));
    await user.click(screen.getByRole("button", { name: "Schmidt Camera 200mm f/5" }));

    expect(screen.getByRole("button", { name: "Sasian Triplet" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Schmidt Camera 200mm f/5" })).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking an example selects it and leaves focus on that example button", async () => {
    renderPage();
    const user = userEvent.setup();
    const example = screen.getByRole("button", { name: "Sasian Triplet" });

    await user.click(example);

    expect(example).toHaveAttribute("aria-pressed", "true");
    expect(example).toHaveFocus();
  });

  it("selects the next menu item when Tab moves focus between example buttons", async () => {
    renderPage();
    const user = userEvent.setup();
    const first = screen.getByRole("button", { name: "Sasian Triplet" });
    const second = screen.getByRole("button", { name: "Newtonian Reflector with Optical Window" });

    await user.click(first);
    await user.tab();

    expect(second).toHaveFocus();
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps arrow navigation selecting and focusing the next menu item", async () => {
    renderPage();
    const user = userEvent.setup();
    const first = screen.getByRole("button", { name: "Sasian Triplet" });
    const second = screen.getByRole("button", { name: "Newtonian Reflector with Optical Window" });

    await user.click(first);
    fireEvent.keyDown(first, { key: "ArrowDown" });

    expect(second).toHaveFocus();
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the overwrite confirmation when Enter is pressed on a chosen menu item", async () => {
    renderPage();
    const user = userEvent.setup();
    const example = screen.getByRole("button", { name: "Sasian Triplet" });

    await user.click(example);
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog", { name: "Load Example System" })).toBeInTheDocument();
  });

  it("does not open the overwrite confirmation from Enter before any example is chosen", async () => {
    renderPage();
    const menu = screen.getByLabelText("Example systems");

    fireEvent.keyDown(menu, { key: "Enter" });

    expect(screen.queryByRole("dialog", { name: "Load Example System" })).not.toBeInTheDocument();
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

  it("renders source links as safe new-tab external links", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sasian Triplet" }));

    const sourceLink = screen.getByRole("link", {
      name: "Web archive link to the original Lecture 4 course material, which includes the lens prescription and aberration coefficient data for this design.",
    });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://web.archive.org/web/20180219044422/http://wp.optics.arizona.edu/jsasian/wp-content/uploads/sites/33/2016/03/L4_OPTI_517_Aberration_Coefficients.pdf",
    );
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(sourceLink).toHaveClass("underline");
    expect(sourceLink).toHaveClass("dark:text-blue-400");
    expect(sourceLink).toHaveClass(cx.externalLink.size.descriptionFontSize);
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

  it("adds adjacent paragraph spacing to the page-specific description panel on all layouts", () => {
    renderPage({ screenSize: "screenLG" });

    expect(screen.getByTestId("description-container")).toHaveClass("[&>p+p]:mt-4");

    renderPage({ screenSize: "screenSM" });

    expect(screen.getAllByTestId("description-container")[1]).toHaveClass("[&>p+p]:mt-4");
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
