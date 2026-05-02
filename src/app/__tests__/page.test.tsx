import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "zustand";
import { createStore } from "zustand";
import HomePage from "@/app/page";
import ExampleSystemsRoute from "@/app/example-systems/page";
import AppShell from "@/app/AppShell";
import GlassMapPage from "@/app/glass-map/page";
import SettingsPage from "@/app/settings/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import AboutPage from "@/app/about/page";
import { SpecsConfiguratorStoreProvider } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreProvider } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreProvider } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreProvider } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { GlassMapStoreProvider } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import {
  OptimizationStoreContext,
  OptimizationStoreProvider,
  useOptimizationStore,
} from "@/features/optimization/providers/OptimizationStoreProvider";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";
import { useLensEditorStore } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { _resetGlassCatalogsResourceForTest } from "@/features/glass-map/lib/glassCatalogsResource";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { DiffractionMtfData, DiffractionPsfData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { Theme } from "@/shared/tokens/theme";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData } from "@/features/lens-editor/types/zernikeData";

let mockSelectedSegment: string | null = null;
let mockSearchParams = new URLSearchParams();
let mockPathname = "/";
const mockPush = jest.fn<void, [string]>();

jest.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => mockSelectedSegment,
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockSetTheme: jest.Mock<void, [Theme]> = jest.fn();
jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

import type { ScreenSize } from "@/shared/hooks/useScreenBreakpoint";
const mockScreenSize = { value: "screenSM" as ScreenSize };
jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => mockScreenSize.value,
}));

const mockGetFirstOrderData: jest.Mock<Promise<Record<string, number>>, [OpticalModel]> = jest
  .fn()
  .mockResolvedValue({ efl: 100, ffl: -80, bfl: 90 });
const mockPlotLensLayout: jest.Mock<Promise<string>, [OpticalModel]> = jest
  .fn()
  .mockResolvedValue("base64-layout");
const mockGetOpdFanData: jest.Mock<Promise<{
  fieldIdx: number;
  wvlIdx: number;
  Sagittal: { x: number[]; y: number[] };
  Tangential: { x: number[]; y: number[] };
  unitX: string;
  unitY: string;
}[]>, [OpticalModel, number]> = jest
  .fn()
  .mockResolvedValue([
    {
      fieldIdx: 0,
      wvlIdx: 0,
      Sagittal: { x: [-1, 0, 1], y: [-0.2, 0, 0.2] },
      Tangential: { x: [-1, 0, 1], y: [-0.1, 0, 0.1] },
      unitX: "",
      unitY: "waves",
    },
  ]);
const mockGetSpotDiagramData: jest.Mock<Promise<{
  fieldIdx: number;
  wvlIdx: number;
  x: number[];
  y: number[];
  unitX: string;
  unitY: string;
}[]>, [OpticalModel, number]> = jest
  .fn()
  .mockResolvedValue([
    {
      fieldIdx: 0,
      wvlIdx: 0,
      x: [0],
      y: [0],
      unitX: "mm",
      unitY: "mm",
    },
  ]);
const mockGet3rdOrderSeidelData: jest.Mock<Promise<SeidelData>, [OpticalModel]> = jest
  .fn()
  .mockResolvedValue({
    surfaceBySurface: {
      aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
      surfaceLabels: ["S1", "sum"],
      data: [[0.1, 0.1], [0.2, 0.2], [0.3, 0.3], [0.4, 0.4], [0.5, 0.5]],
    },
    transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
    wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
    curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
  });
const mockGetDiffractionPSFData: jest.Mock<Promise<DiffractionPsfData>, [OpticalModel, number, number]> = jest
  .fn()
  .mockResolvedValue({
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
  });
const mockGetDiffractionMTFData: jest.Mock<Promise<DiffractionMtfData>, [OpticalModel, number, number]> = jest
  .fn()
  .mockResolvedValue({
    fieldIdx: 0,
    wvlIdx: 0,
    Tangential: { x: [0], y: [1] },
    Sagittal: { x: [0], y: [1] },
    IdealTangential: { x: [0], y: [1] },
    IdealSagittal: { x: [0], y: [1] },
    unitX: "cycles/mm",
    unitY: "",
    cutoffTangential: 0,
    cutoffSagittal: 0,
    naTangential: 0,
    naSagittal: 0,
  });
const mockGetWavefrontData: jest.Mock<Promise<WavefrontMapData>, [OpticalModel, number, number]> = jest
  .fn()
  .mockResolvedValue({
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
  });
const mockGetRayFanData = jest.fn().mockResolvedValue([
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
]);

const mockProxy = {
  init: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  getFirstOrderData: mockGetFirstOrderData,
  plotLensLayout: mockPlotLensLayout,
  getRayFanData: mockGetRayFanData,
  getOpdFanData: mockGetOpdFanData,
  getSpotDiagramData: mockGetSpotDiagramData,
  getWavefrontData: mockGetWavefrontData,
  getGeoPSFData: jest.fn().mockResolvedValue({
    fieldIdx: 0,
    wvlIdx: 0,
    x: [0],
    y: [0],
    unitX: "mm",
    unitY: "mm",
  }),
  getDiffractionPSFData: mockGetDiffractionPSFData,
  getDiffractionMTFData: mockGetDiffractionMTFData,
  get3rdOrderSeidelData: mockGet3rdOrderSeidelData,
  getZernikeCoefficients: jest.fn<Promise<ZernikeData>, [OpticalModel, number, number, number?]>().mockResolvedValue({
    coefficients: [],
    rms_normalized_coefficients: [],
    rms_wfe: 0,
    pv_wfe: 0,
    strehl_ratio: 1,
    num_terms: 0,
    field_index: 0,
    wavelength_nm: 587.6,
  }),
  focusByMonoRmsSpot: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByMonoStrehl: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByPolyRmsSpot: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByPolyStrehl: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  getAllGlassCatalogsData: jest.fn().mockResolvedValue({}),
  evaluateOptimizationProblem: jest.fn().mockResolvedValue({
    success: true,
    status: "evaluated",
    message: "ok",
    optimizer: { kind: "least_squares", method: "trf" },
    initial_values: [],
    final_values: [],
    pickups: [],
    residuals: [],
    merit_function: { sum_of_squares: 0, rss: 0 },
  }),
  optimizeOpm: jest.fn().mockResolvedValue({
    success: true,
    status: "optimized",
    message: "done",
    optimizer: { kind: "least_squares", method: "trf" },
    initial_values: [],
    final_values: [],
    pickups: [],
    residuals: [],
    merit_function: { sum_of_squares: 0, rss: 0 },
  }),
} satisfies Record<keyof PyodideWorkerAPI, jest.Mock>;

const optimizationGuardModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 42,
      thickness: 5,
      medium: "BK7",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 12.5 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0], isRelative: true },
    wavelengths: { weights: [[587.562, 1]], referenceIndex: 0 },
  },
};

type MockUsePyodideResult = {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  error: string | undefined;
  initProgress: {
    value: number;
    status: string;
  };
};

const mockUsePyodide = jest.fn<MockUsePyodideResult, []>(() => ({
  proxy: mockProxy,
  isReady: true,
  error: undefined,
  initProgress: { value: 100, status: "Ready" },
}));

jest.mock("@/shared/hooks/usePyodide", () => ({
  usePyodide: () => mockUsePyodide(),
}));

function renderWithStores(node: React.ReactNode) {
  return render(
    <SpecsConfiguratorStoreProvider>
      <LensEditorStoreProvider>
        <AnalysisPlotStoreProvider>
          <AnalysisDataStoreProvider>
            <LensLayoutImageStoreProvider>
              <GlassMapStoreProvider>{node}</GlassMapStoreProvider>
            </LensLayoutImageStoreProvider>
          </AnalysisDataStoreProvider>
        </AnalysisPlotStoreProvider>
      </LensEditorStoreProvider>
    </SpecsConfiguratorStoreProvider>
  );
}

function renderInAppShell(node: React.ReactNode) {
  return renderWithStores(
    <OptimizationStoreProvider>
      <AppShell>{node}</AppShell>
    </OptimizationStoreProvider>,
  );
}

function renderInAppShellWithOptimizationStore(
  node: React.ReactNode,
  optimizationStore = createStore<OptimizationState>(createOptimizationSlice),
) {
  const rendered = renderWithStores(
    <OptimizationStoreContext.Provider value={optimizationStore}>
      <AppShell>{node}</AppShell>
    </OptimizationStoreContext.Provider>,
  );
  return { ...rendered, optimizationStore };
}

function StoreProbe() {
  const store = useGlassMapStore();
  const selectedGlass = useStore(store, (s) => s.selectedGlass);
  return <div data-testid="selected-glass-name">{selectedGlass?.glassName ?? "none"}</div>;
}

function RouteSwitchHarness() {
  const [route, setRoute] = useState<"glass" | "settings">("glass");
  const store = useGlassMapStore();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          store.getState().setSelectedGlass({
            catalogName: "Schott",
            glassName: "N-BK7",
            data: {
              refractiveIndexD: 1.5168,
              refractiveIndexE: 1.519,
              abbeNumberD: 64.17,
              abbeNumberE: 63.96,
              partialDispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
              dispersionCoeffKind: "Sellmeier3T",
              dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
            },
          })
        }
      >
        Set glass
      </button>
      <button
        type="button"
        onClick={() => setRoute((current) => (current === "glass" ? "settings" : "glass"))}
      >
        Toggle route
      </button>
      <StoreProbe />
      {route === "glass" ? <GlassMapPage /> : <div>Settings route</div>}
    </>
  );
}

function SeedUnappliedOptimizationResult() {
  const store = useOptimizationStore();

  React.useEffect(() => {
    store.setState({
      optimizationModel: optimizationGuardModel,
      hasUnappliedOptimizationResult: true,
    });
  }, [store]);

  return <div>Optimization body</div>;
}

function LensEditorRadiusProbe() {
  const lensStore = useLensEditorStore();
  const radius = useStore(lensStore, (state) => {
    const row = state.rows[1];
    return row?.kind === "surface" || row?.kind === "image"
      ? row.curvatureRadius
      : undefined;
  });
  return <div data-testid="editor-radius">{radius ?? "missing"}</div>;
}

describe("app shell routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetGlassCatalogsResourceForTest();
    mockSelectedSegment = null;
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();
    window.history.pushState({}, "", "/");
    mockPush.mockReset();
    mockUsePyodide.mockReturnValue({
      proxy: mockProxy,
      isReady: true,
      error: undefined,
      initProgress: { value: 100, status: "Ready" },
    });
  });

  it("renders shared chrome around route content", () => {
    renderInAppShell(<div>Route body</div>);

    expect(screen.getByText("Ray Optics Web")).toBeInTheDocument();
    expect(screen.getByText("Route body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
  });

  it("shows the Pyodide loading overlay from the app shell layout", () => {
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });

    renderInAppShell(<HomePage />);

    expect(screen.getByText("Initializing Ray Optics")).toBeInTheDocument();
    expect(screen.getByText("Loading Pyodide packages")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Initialization progress" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("shows the glass-catalog preload milestone while catalogs load", () => {
    mockProxy.getAllGlassCatalogsData.mockImplementationOnce(() => new Promise(() => undefined));

    renderInAppShell(<HomePage />);

    expect(screen.getByText("Preloading glass catalogs")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Initialization progress" })).toHaveAttribute("aria-valuenow", "90");
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("blocks beforeunload across the app even when no optimization result is waiting to be applied", () => {
    renderInAppShell(<HomePage />);

    const spy = jest.spyOn(Event.prototype, "preventDefault");
    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    Object.defineProperty(event, "returnValue", { value: undefined, writable: true });
    window.dispatchEvent(event);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe("");
    spy.mockRestore();
  });

  it("blocks beforeunload when an optimization result has not been applied to the editor", async () => {
    renderInAppShell(<SeedUnappliedOptimizationResult />);
    await screen.findByText("Optimization body");

    const spy = jest.spyOn(Event.prototype, "preventDefault");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("warns before SideNav navigation leaves Optimization with an unapplied result", async () => {
    mockPathname = "/optimization";
    mockSelectedSegment = "optimization";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));

    expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not dismiss the unapplied optimization warning from a backdrop click", async () => {
    mockPathname = "/optimization";
    mockSelectedSegment = "optimization";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    fireEvent.click(screen.getByTestId("modal-backdrop"));

    expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
  });

  it("keeps the user on Optimization when the warning Stay action is chosen", async () => {
    mockPathname = "/optimization";
    mockSelectedSegment = "optimization";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    await user.click(screen.getByRole("button", { name: "Stay" }));

    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("continues to the requested SideNav route when the warning Leave action is chosen", async () => {
    mockPathname = "/optimization";
    mockSelectedSegment = "optimization";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    await user.click(screen.getByRole("button", { name: "Leave" }));

    expect(mockPush).toHaveBeenCalledWith("/glass-map");
  });

  it("applies the optimization result to the editor and continues navigation from the warning", async () => {
    mockPathname = "/optimization";
    mockSelectedSegment = "optimization";
    const user = userEvent.setup();
    const { optimizationStore } = renderInAppShellWithOptimizationStore(
      <>
        <SeedUnappliedOptimizationResult />
        <LensEditorRadiusProbe />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));

    expect(screen.getByTestId("editor-radius")).toHaveTextContent("42");
    expect(optimizationStore.getState().hasUnappliedOptimizationResult).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/glass-map");
  });

  it("warns on browser back navigation away from Optimization with an unapplied result", async () => {
    mockPathname = "/optimization";
    window.history.pushState({}, "", "/optimization");
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    renderInAppShell(<SeedUnappliedOptimizationResult />);
    await screen.findByText("Optimization body");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    });

    window.history.pushState({}, "", "/");
    fireEvent(window, new PopStateEvent("popstate"));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
    });
    expect(window.location.pathname).toBe("/optimization");
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("asks for native confirmation on browser history navigation from a normal app route", () => {
    mockPathname = "/glass-map";
    window.history.pushState({}, "", "/glass-map?catalog=Schott#details");
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    renderInAppShell(<GlassMapPage />);

    window.history.pushState({}, "", "/settings?tab=display#theme");
    fireEvent(window, new PopStateEvent("popstate"));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/glass-map");
    expect(window.location.search).toBe("?catalog=Schott");
    expect(window.location.hash).toBe("#details");
    confirmSpy.mockRestore();
  });

  it("keeps the browser history destination when native confirmation is accepted", () => {
    mockPathname = "/glass-map";
    window.history.pushState({}, "", "/glass-map?catalog=Schott#details");
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    renderInAppShell(<GlassMapPage />);

    window.history.pushState({}, "", "/settings?tab=display#theme");
    fireEvent(window, new PopStateEvent("popstate"));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/settings");
    expect(window.location.search).toBe("?tab=display");
    expect(window.location.hash).toBe("#theme");
    confirmSpy.mockRestore();
  });

  it("renders the lens editor on the root route", () => {
    renderInAppShell(<HomePage />);

    expect(screen.queryByLabelText("Example system")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "System Specs" })).toBeInTheDocument();
  });

  it("renders the example systems route", () => {
    renderInAppShell(<ExampleSystemsRoute />);

    expect(screen.getByRole("heading", { name: "Example Systems" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sasian Triplet" })).toBeInTheDocument();
  });

  it("preloads glass catalog data while rendering the home route", async () => {
    renderInAppShell(<HomePage />);

    await waitFor(() => {
      expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
  });

  it("renders the glass map on the glass-map route", async () => {
    renderInAppShell(<GlassMapPage />);

    await waitFor(() => {
      expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
  });

  it("does not refetch glass catalog data when opening glass map after home preload", async () => {
    const { unmount } = renderInAppShell(<HomePage />);

    await waitFor(() => {
      expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });

    unmount();
    renderInAppShell(<GlassMapPage />);

    await waitFor(() => {
      expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
  });

  it("passes MediumSelectorModal route intent from search params into the glass map page", async () => {
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");

    renderInAppShell(<GlassMapPage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Back to lens editor" })).toHaveAttribute("href", "/");
    });
  });

  it("renders the glass-map Suspense fallback inside the store provider", () => {
    const suspensePromise = new Promise<never>(() => {});
    mockSearchParams = {
      get: () => {
        throw suspensePromise;
      },
    } as unknown as URLSearchParams;

    expect(() => renderInAppShell(<GlassMapPage />)).not.toThrow();
    expect(screen.getByText(/loading glass catalog data/i)).toBeInTheDocument();
  });

  it("retains glass-map store state across route switches", async () => {
    renderInAppShell(<RouteSwitchHarness />);

    expect(screen.getByTestId("selected-glass-name")).toHaveTextContent("none");
    await userEvent.click(screen.getByRole("button", { name: "Set glass" }));
    expect(screen.getByTestId("selected-glass-name")).toHaveTextContent("N-BK7");

    await userEvent.click(screen.getByRole("button", { name: "Toggle route" }));
    expect(screen.getByText("Settings route")).toBeInTheDocument();
    expect(screen.getByTestId("selected-glass-name")).toHaveTextContent("N-BK7");

    await userEvent.click(screen.getByRole("button", { name: "Toggle route" }));
    expect(screen.getByTestId("selected-glass-name")).toHaveTextContent("N-BK7");
  });

  it("renders the settings route content", () => {
    renderWithStores(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
  });

  it("renders the privacy-policy route content", () => {
    renderWithStores(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("renders the about route content", () => {
    renderWithStores(<AboutPage />);

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("opens the shared error modal when the lens editor reports a worker error", async () => {
    mockGetFirstOrderData.mockRejectedValueOnce(new Error("bad input"));
    renderInAppShell(<HomePage />);

    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
