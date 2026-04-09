import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "zustand";
import HomePage from "@/app/page";
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
import { _resetGlassCatalogsResourceForTest } from "@/features/glass-map/glassCatalogsResource";
import type { DiffractionPsfData, OpticalModel, SeidelData, WavefrontMapData } from "@/shared/lib/types/opticalModel";
import type { Theme } from "@/shared/tokens/theme";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData } from "@/shared/lib/types/zernikeData";

let mockSelectedSegment: string | null = null;
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => mockSelectedSegment,
  useSearchParams: () => mockSearchParams,
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
const mockPlotRayFan: jest.Mock<Promise<string>, [OpticalModel, number]> = jest
  .fn()
  .mockResolvedValue("base64-rayfan");
const mockPlotOpdFan: jest.Mock<Promise<string>, [OpticalModel, number]> = jest
  .fn()
  .mockResolvedValue("base64-opdfan");
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
const mockPlotSpotDiagram: jest.Mock<Promise<string>, [OpticalModel, number]> = jest
  .fn()
  .mockResolvedValue("base64-spot");
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
const mockPlotSurfaceBySurface3rdOrderAberr: jest.Mock<Promise<string>, [OpticalModel]> = jest
  .fn()
  .mockResolvedValue("base64-3rdorder");
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

const mockProxy = {
  init: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  getFirstOrderData: mockGetFirstOrderData,
  plotLensLayout: mockPlotLensLayout,
  plotRayFan: mockPlotRayFan,
  plotOpdFan: mockPlotOpdFan,
  getOpdFanData: mockGetOpdFanData,
  plotSpotDiagram: mockPlotSpotDiagram,
  getSpotDiagramData: mockGetSpotDiagramData,
  plotSurfaceBySurface3rdOrderAberr: mockPlotSurfaceBySurface3rdOrderAberr,
  plotWavefrontMap: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-wavefront"),
  getWavefrontData: mockGetWavefrontData,
  getGeoPSFData: jest.fn().mockResolvedValue({
    fieldIdx: 0,
    wvlIdx: 0,
    x: [0],
    y: [0],
    unitX: "mm",
    unitY: "mm",
  }),
  plotGeoPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-geopsf"),
  plotDiffractionPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-diffrpsf"),
  getDiffractionPSFData: mockGetDiffractionPSFData,
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
} satisfies Record<keyof PyodideWorkerAPI, jest.Mock>;

type MockUsePyodideResult = {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  error: string | undefined;
};

const mockUsePyodide = jest.fn<MockUsePyodideResult, []>(() => ({
  proxy: mockProxy,
  isReady: true,
  error: undefined,
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
  return renderWithStores(<AppShell>{node}</AppShell>);
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

describe("app shell routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetGlassCatalogsResourceForTest();
    mockSelectedSegment = null;
    mockSearchParams = new URLSearchParams();
    mockUsePyodide.mockReturnValue({
      proxy: mockProxy,
      isReady: true,
      error: undefined,
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
    });

    renderInAppShell(<HomePage />);

    expect(screen.getByText("Initializing Ray Optics")).toBeInTheDocument();
    expect(screen.getByText("Loading Pyodide, installing packages, and preloading glass catalogs…")).toBeInTheDocument();
  });

  it("registers a beforeunload handler from the shared shell", () => {
    renderInAppShell(<HomePage />);

    const spy = jest.spyOn(Event.prototype, "preventDefault");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("renders the lens editor on the root route", () => {
    renderInAppShell(<HomePage />);

    expect(screen.getByLabelText("Example system")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "System Specs" })).toBeInTheDocument();
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
