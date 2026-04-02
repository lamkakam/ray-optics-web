import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/(app-shell)/page";
import AppShellLayout from "@/app/(app-shell)/layout";
import GlassMapPage from "@/app/(app-shell)/glass-map/page";
import SettingsPage from "@/app/(app-shell)/settings/page";
import PrivacyPolicyPage from "@/app/(app-shell)/privacy-policy/page";
import AboutPage from "@/app/(app-shell)/about/page";
import { SpecsConfiguratorStoreProvider } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreProvider } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreProvider } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreProvider } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import { GlassMapStoreProvider } from "@/features/glass-map/providers/GlassMapStoreProvider";
import type { OpticalModel, SeidelData } from "@/shared/lib/types/opticalModel";
import type { Theme } from "@/shared/tokens/theme";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData } from "@/shared/lib/types/zernikeData";

let mockSelectedSegment: string | null = null;

jest.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => mockSelectedSegment,
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
const mockPlotSpotDiagram: jest.Mock<Promise<string>, [OpticalModel, number]> = jest
  .fn()
  .mockResolvedValue("base64-spot");
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

const mockProxy = {
  init: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  getFirstOrderData: mockGetFirstOrderData,
  plotLensLayout: mockPlotLensLayout,
  plotRayFan: mockPlotRayFan,
  plotOpdFan: mockPlotOpdFan,
  plotSpotDiagram: mockPlotSpotDiagram,
  plotSurfaceBySurface3rdOrderAberr: mockPlotSurfaceBySurface3rdOrderAberr,
  plotWavefrontMap: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-wavefront"),
  plotGeoPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-geopsf"),
  plotDiffractionPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-diffrpsf"),
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
  return renderWithStores(<AppShellLayout>{node}</AppShellLayout>);
}

describe("app shell routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedSegment = null;
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
    expect(screen.getByText("Loading Pyodide and installing packages…")).toBeInTheDocument();
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

  it("renders the glass map on the glass-map route", async () => {
    renderInAppShell(<GlassMapPage />);

    await waitFor(() => {
      expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
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
