import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "zustand";
import { createStore } from "zustand";
import type { StoreApi } from "zustand";
import HomePage from "@/app/page";
import ExampleSystemsRoute from "@/app/example-systems/page";
import AppShell from "@/app/AppShell";
import GlassMapPage from "@/app/glass-map/page";
import SettingsPage from "@/app/settings/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import AboutPage from "@/app/about/page";
import { useAppShell } from "@/app/AppShellContext";
import { SpecsConfiguratorStoreProvider } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreProvider } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisPlotStoreProvider } from "@/features/analysis/providers/AnalysisPlotStoreProvider";
import { AnalysisDataStoreProvider } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { LensLayoutImageStoreProvider } from "@/features/analysis/providers/LensLayoutImageStoreProvider";
import {
  GlassMapStoreContext,
} from "@/features/glass-map/providers/GlassMapStoreProvider";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { ImagePointProvider, type ImagePoint } from "@/shared/components/providers/ImagePointProvider";
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
import { _resetGlassCatalogLoaderForTest } from "@/features/glass-map/lib/glassCatalogLoader";
import { useGlassCatalogs } from "@/shared/components/providers/GlassCatalogProvider";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { DiffractionMtfData, DiffractionPsfData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type { Theme } from "@/shared/tokens/theme";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import { OBJECT_ROW_ID } from "@/shared/lib/lens-prescription-grid/types/gridTypes";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import type { GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";

let mockSelectedSegment: string | null = null;
let mockSearchParams = new URLSearchParams();
let mockPathname = "/";
const mockPush = jest.fn<void, [string]>();
const mockReplace = jest.fn<void, [string]>();
let mockRouter = { push: mockPush, replace: mockReplace };
let mockStoredCustomGlassRows: readonly unknown[] = [];

const loadedCatalogsData: AllGlassCatalogsData = {
  CDGM: {},
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Schott: {
    "N-BK7": {
      refractiveIndexD: 1.5168,
      refractiveIndexE: 1.519,
      abbeNumberD: 64.17,
      abbeNumberE: 63.96,
      partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
      dispersionCoeffKind: "Sellmeier3T",
      dispersionCoeffs: [
        1.03961212,
        0.231792344,
        1.01046945,
        0.00600069867,
        0.0200179144,
        103.560653,
      ],
    },
  },
  Sumita: {},
  Special: {},
};

const persistedCustomGlassData = {
  refractiveIndexD: 1.7,
  refractiveIndexE: 1.705,
  abbeNumberD: 45.2,
  abbeNumberE: 45,
  partialDispersions: { P_gF: 0.53, P_Fd: 0.41, P_fe: 0.4 },
  dispersionCoeffKind: "tabulated",
  dispersionCoeffs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
} as const;

const catalogsWithSecondSchottGlass = {
  ...loadedCatalogsData,
  Schott: {
    ...loadedCatalogsData.Schott,
    "N-F2": persistedCustomGlassData,
  },
} satisfies AllGlassCatalogsData;

jest.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => mockSelectedSegment,
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}));

jest.mock("next/link", () => {
  return function MockLink({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { readonly href: string }) {
    return (
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </a>
    );
  };
});

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/features/import-custom-glass/lib/customGlassStorage", () => ({
  isPersistedCustomGlassRow: (value: unknown) => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const row = value as { readonly label?: unknown; readonly type?: unknown; readonly pairs?: unknown };
    return typeof row.label === "string" && row.type === "tabulated" && Array.isArray(row.pairs);
  },
  readStoredCustomGlassRows: jest.fn(() => Promise.resolve(mockStoredCustomGlassRows)),
  quarantinePersistedCustomGlass: jest.fn().mockResolvedValue(undefined),
  quarantineStoredCustomGlassRow: jest.fn().mockResolvedValue(undefined),
}));

const customGlassStorageMock = jest.requireMock("@/features/import-custom-glass/lib/customGlassStorage") as {
  readonly readStoredCustomGlassRows: jest.Mock<Promise<readonly unknown[]>, []>;
  readonly quarantinePersistedCustomGlass: jest.Mock<Promise<void>, [unknown]>;
  readonly quarantineStoredCustomGlassRow: jest.Mock<Promise<void>, [unknown, string]>;
};
const mockReadStoredCustomGlassRows = customGlassStorageMock.readStoredCustomGlassRows;
const mockQuarantinePersistedCustomGlass = customGlassStorageMock.quarantinePersistedCustomGlass;
const mockQuarantineStoredCustomGlassRow = customGlassStorageMock.quarantineStoredCustomGlassRow;

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
    scaleKind: "image-na",
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
  getSurfaceSemiDiameters: jest.fn().mockResolvedValue([]),
  plotLensLayout: mockPlotLensLayout,
  getRayFanData: mockGetRayFanData,
  getOpdFanData: mockGetOpdFanData,
  getSpotDiagramData: mockGetSpotDiagramData,
  getFieldCurvatureData: jest.fn().mockResolvedValue({
    wvlIdx: 0,
    Sagittal: { x: [0], y: [0] },
    Tangential: { x: [0], y: [0] },
    fieldLabels: ["0"],
    unitX: "mm",
    unitY: "deg",
  }),
  getAstigmatismCurveData: jest.fn().mockResolvedValue({
    wvlIdx: 0,
    Astigmatism: { x: [0], y: [0] },
    fieldLabels: ["0"],
    unitX: "mm",
    unitY: "deg",
  }),
  getWavefrontData: mockGetWavefrontData,
  getStrehlVsWavelengthData: jest.fn().mockResolvedValue({
    fieldIdx: 0,
    x: [486.1, 587.6, 656.3],
    y: [0.72, 0.94, 0.81],
    unitX: "nm",
    unitY: "",
  }),
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
  getLSAData: jest.fn().mockResolvedValue([]),
  get3rdOrderSeidelData: mockGet3rdOrderSeidelData,
  getZernikeCoefficients: jest.fn<Promise<ZernikeData>, [OpticalModel, number, number, ImagePoint?, number?, ZernikeOrdering?]>().mockResolvedValue({
    coefficients: [],
    rms_normalized_coefficients: [],
    rms_wfe: 0,
    pv_wfe: 0,
    weighted_mean_wfe: 0,
    fit_residual_rms: 0,
    fit_rank: 0,
    condition_number: 1,
    strehl_ratio: 1,
    strehl_assumption: "uniform_scalar_amplitude_at_reference_point",
    num_terms: 0,
    field_index: 0,
    wavelength_nm: 587.6,
    pupil_space: "entrance",
    sampling_measure: "projected_reference_sphere_area",
    normalization: "chief_ray_centered_enclosing_circle",
    reference_kind: "finite_reference_sphere",
    reference_length_unit: "mm",
    reference_radius: 1,
    reference_center: [0, 0, 1],
    reference_pupil_point: [0, 0, 0],
    reference_x_axis: [1, 0, 0],
    reference_y_axis: [0, 1, 0],
    reference_z_axis: [0, 0, 1],
    normalization_radius: 1,
    support_area: Math.PI,
    support_coverage: 1,
    sample_count: 0,
    boundary_resolution: 64,
    boundary_converged: true,
  }),
  focusByMonoRmsSpot: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByMonoStrehl: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByPolyRmsSpot: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  focusByPolyStrehl: jest.fn().mockResolvedValue({ delta_thi: 0, metric_value: 0 }),
  getAllGlassCatalogsData: jest.fn().mockResolvedValue({}),
  addUserDefinedGlasses: jest.fn().mockResolvedValue({}),
  deleteUserDefinedGlasses: jest.fn().mockResolvedValue(undefined),
  updateUserDefinedGlasses: jest.fn().mockResolvedValue({}),
  getUserDefinedGlasses: jest.fn().mockResolvedValue({}),
  canInterruptOptimization: jest.fn().mockResolvedValue(true),
  requestOptimizationStop: jest.fn().mockResolvedValue({ signaled: true }),
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
  optimizeGlasses: jest.fn(),
} satisfies Record<keyof PyodideWorkerAPI, jest.Mock>;

const alternateMockProxy = {} as PyodideWorkerAPI;

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

/** Renders provider-backed routes with an explicit initial glass-catalog state and optional store-action overrides. */
function renderWithGlassCatalogs(
  node: React.ReactNode,
  catalogsData: AllGlassCatalogsData | undefined,
  configureStore?: (store: StoreApi<GlassMapStore>) => void,
) {
  const glassMapStore = createStore(createGlassMapSlice);
  configureStore?.(glassMapStore);
  if (catalogsData !== undefined) {
    glassMapStore.getState().setCatalogsData(catalogsData);
  }

  const rendered = render(
    <ImagePointProvider>
      <SpecsConfiguratorStoreProvider>
        <LensEditorStoreProvider>
          <AnalysisPlotStoreProvider>
            <AnalysisDataStoreProvider>
              <LensLayoutImageStoreProvider>
                <GlassMapStoreContext.Provider value={glassMapStore}>
                  {node}
                </GlassMapStoreContext.Provider>
              </LensLayoutImageStoreProvider>
            </AnalysisDataStoreProvider>
          </AnalysisPlotStoreProvider>
        </LensEditorStoreProvider>
      </SpecsConfiguratorStoreProvider>
    </ImagePointProvider>
  );

  return { ...rendered, glassMapStore };
}

/** Renders ordinary routes with catalogs already available, avoiding unrelated preload work. */
function renderWithStores(node: React.ReactNode) {
  return renderWithGlassCatalogs(node, loadedCatalogsData);
}

/** Renders catalog-preload lifecycle cases from a deliberately empty store. */
function renderWithEmptyGlassCatalogs(node: React.ReactNode) {
  return renderWithGlassCatalogs(node, undefined);
}

function renderWithSeededGlassCatalogs(node: React.ReactNode, catalogsData = loadedCatalogsData) {
  return renderWithGlassCatalogs(node, catalogsData);
}

function renderInAppShell(node: React.ReactNode) {
  return renderWithStores(
    <OptimizationStoreProvider>
      <AppShell>{node}</AppShell>
    </OptimizationStoreProvider>,
  );
}

/** Renders AppShell catalog-preload lifecycle cases from an explicitly empty store. */
function renderInAppShellWithEmptyGlassCatalogs(node: React.ReactNode) {
  return renderWithEmptyGlassCatalogs(
    <OptimizationStoreProvider>
      <AppShell>{node}</AppShell>
    </OptimizationStoreProvider>,
  );
}

/** Renders preload cases where the catalog commit is intentionally observable through context status. */
function renderInAppShellWithCatalogCommitDisabled(node: React.ReactNode) {
  return renderWithGlassCatalogs(
    <OptimizationStoreProvider>
      <AppShell>{node}</AppShell>
    </OptimizationStoreProvider>,
    undefined,
    (store) => {
      store.setState({
        setCatalogsData: jest.fn<void, [AllGlassCatalogsData]>(),
      });
    },
  );
}

function renderInAppShellWithSeededGlassCatalogs(node: React.ReactNode) {
  return renderWithSeededGlassCatalogs(
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

/** Provides a stable shell tree whose child state can be rerendered after mocked router or URL changes. */
function RerenderableAppShellHarness({ children }: { readonly children: React.ReactNode }) {
  const [, setRenderCount] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setRenderCount((count) => count + 1)}>Rerender shell</button>
      <OptimizationStoreProvider>
        <AppShell>{children}</AppShell>
      </OptimizationStoreProvider>
    </>
  );
}

/** Swaps the Optimization store instance after mount so AppShell effect rebinding is observable. */
function OptimizationStoreSwapHarness({
  initialStore,
  nextStore,
  children,
}: {
  readonly initialStore: StoreApi<OptimizationState>;
  readonly nextStore: StoreApi<OptimizationState>;
  readonly children: React.ReactNode;
}) {
  const [useNextStore, setUseNextStore] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setUseNextStore(true)}>Swap optimization store</button>
      <OptimizationStoreContext.Provider value={useNextStore ? nextStore : initialStore}>
        <AppShell>{children}</AppShell>
      </OptimizationStoreContext.Provider>
    </>
  );
}

/** Re-renders the route while keeping the AppShell and glass-map store mounted. */
function SearchParamsRerenderHarness() {
  const [, setRenderCount] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setRenderCount((count) => count + 1)}>Rerender search params</button>
      <GlassMapPage />
    </>
  );
}

function StoreProbe() {
  const store = useGlassMapStore();
  const selectedGlass = useStore(store, (s) => s.selectedGlass);
  return <div data-testid="selected-glass-name">{selectedGlass?.glassName ?? "none"}</div>;
}

function GlassCatalogStoreProbe() {
  const store = useGlassMapStore();
  const catalogsData = useStore(store, (s) => s.catalogsData);
  const lookupMaps = useStore(store, (s) => s.lookupMaps);
  const glassCatalogs = useGlassCatalogs();

  return (
    <>
      <div data-testid="catalogs-loaded">{glassCatalogs.isLoaded ? "loaded" : "not-loaded"}</div>
      <div data-testid="catalogs-loading">{glassCatalogs.isLoading ? "loading" : "not-loading"}</div>
      <div data-testid="catalogs-error">{glassCatalogs.error ?? "none"}</div>
      <div data-testid="schott-count">{Object.keys(catalogsData?.Schott ?? {}).length}</div>
      <div data-testid="custom-count">{Object.keys(catalogsData?.Custom ?? {}).length}</div>
      <div data-testid="lookup-medium">{lookupMaps?.mediumMap.get("schott:n-bk7")?.manufacturer ?? "none"}</div>
      <div data-testid="context-lookup-medium">{glassCatalogs.lookupMaps?.mediumMap.get("schott:n-bk7")?.manufacturer ?? "none"}</div>
    </>
  );
}

function AppShellRuntimeProbe() {
  const { proxy, isReady, openErrorModal } = useAppShell();

  return (
    <>
      <div data-testid="runtime-proxy">
        {proxy === mockProxy ? "primary" : proxy === alternateMockProxy ? "alternate" : "none"}
      </div>
      <div data-testid="runtime-ready">{isReady ? "ready" : "not-ready"}</div>
      <button type="button" onClick={openErrorModal}>Open shell error</button>
    </>
  );
}

function GlassCatalogPreloadProbe() {
  const glassCatalogs = useGlassCatalogs();
  const [preloadResult, setPreloadResult] = useState("none");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void glassCatalogs.preload().then((result) => {
            setPreloadResult(result?.data === glassCatalogs.catalogs ? "store-data" : "other");
          });
        }}
      >
        Preload catalogs
      </button>
      <div data-testid="preload-result">{preloadResult}</div>
    </>
  );
}

function ClearCatalogDataAfterPreloadProbe() {
  const store = useGlassMapStore();
  const glassCatalogs = useGlassCatalogs();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void glassCatalogs.preload().then(() => {
            store.setState({ catalogsData: undefined, lookupMaps: undefined });
          });
        }}
      >
        Clear catalog data after preload
      </button>
      <div data-testid="cleared-catalogs-loaded">{glassCatalogs.isLoaded ? "loaded" : "not-loaded"}</div>
      <div data-testid="cleared-catalogs-loading">{glassCatalogs.isLoading ? "loading" : "not-loading"}</div>
    </>
  );
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
              partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
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

function SeedUnappliedOptimizationResult({ model = optimizationGuardModel }: { readonly model?: OpticalModel }) {
  const store = useOptimizationStore();

  React.useEffect(() => {
    store.setState({
      optimizationModel: model,
      hasUnappliedOptimizationResult: true,
    });
  }, [model, store]);

  return <div>Optimization body</div>;
}

function SeedUnappliedOptimizationWithoutModel() {
  const store = useOptimizationStore();

  React.useEffect(() => {
    store.setState({
      optimizationModel: undefined,
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

function SeedPendingMediumSelection() {
  const store = useLensEditorStore();
  const pendingSelection = useStore(store, (state) => state.pendingMediumSelection);
  const objectRow = useStore(store, (state) => state.rows[0]);

  React.useEffect(() => {
    store.getState().openMediumModal(OBJECT_ROW_ID);
  }, [store]);

  return (
    <>
      <div data-testid="pending-medium">{pendingSelection?.medium ?? "none"}</div>
      <div data-testid="pending-manufacturer">{pendingSelection?.manufacturer || "none"}</div>
      <div data-testid="confirmed-medium">
        {objectRow?.kind === "object" ? objectRow.medium : "missing"}
      </div>
    </>
  );
}

describe("app shell routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetGlassCatalogLoaderForTest();
    mockSelectedSegment = null;
    mockPathname = "/";
    mockSearchParams = new URLSearchParams();
    mockStoredCustomGlassRows = [];
    mockRouter = { push: mockPush, replace: mockReplace };
    mockReadStoredCustomGlassRows.mockImplementation(() => Promise.resolve(mockStoredCustomGlassRows));
    mockQuarantinePersistedCustomGlass.mockResolvedValue(undefined);
    mockQuarantineStoredCustomGlassRow.mockResolvedValue(undefined);
    window.history.pushState({}, "", "/");
    mockPush.mockReset();
    mockReplace.mockReset();
    mockUsePyodide.mockReturnValue({
      proxy: mockProxy,
      isReady: true,
      error: undefined,
      initProgress: { value: 100, status: "Ready" },
    });
  });

  it("renders shared chrome around route content without reloading seeded catalogs", () => {
    renderInAppShell(
      <>
        <GlassCatalogStoreProbe />
        <div>Route body</div>
      </>,
    );

    expect(screen.getByText("Ray Optics Web")).toBeInTheDocument();
    expect(screen.getByText("Route body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
    expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/);
    expect(screen.queryByText("Initializing Ray Optics")).not.toBeInTheDocument();
    expect(screen.queryByText("Preloading glass catalogs")).not.toBeInTheDocument();
    expect(mockProxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("provides current runtime values and closes the generic shell error modal", async () => {
    const user = userEvent.setup();
    renderWithStores(
      <RerenderableAppShellHarness>
        <AppShellRuntimeProbe />
      </RerenderableAppShellHarness>,
    );

    expect(screen.getByTestId("runtime-proxy")).toHaveTextContent("primary");
    expect(screen.getByTestId("runtime-ready")).toHaveTextContent("ready");

    mockUsePyodide.mockReturnValue({
      proxy: alternateMockProxy,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });
    await user.click(screen.getByRole("button", { name: "Rerender shell" }));

    expect(screen.getByTestId("runtime-proxy")).toHaveTextContent("alternate");
    expect(screen.getByTestId("runtime-ready")).toHaveTextContent("not-ready");
    await user.click(screen.getByRole("button", { name: "Open shell error" }));
    expect(screen.getByRole("dialog", { name: "Error" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog", { name: "Error" })).not.toBeInTheDocument();
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

  it("does not begin catalog loading while the runtime is not ready even when a proxy exists", () => {
    mockUsePyodide.mockReturnValue({
      proxy: mockProxy,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });

    renderInAppShellWithEmptyGlassCatalogs(<HomePage />);

    expect(screen.getByText("Loading Pyodide packages")).toBeInTheDocument();
    expect(mockProxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("does not show an initialization overlay when the runtime has no proxy but reports ready", () => {
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: true,
      error: undefined,
      initProgress: { value: 100, status: "Ready" },
    });

    renderInAppShellWithEmptyGlassCatalogs(<GlassCatalogStoreProbe />);

    expect(screen.queryByText("Initializing Ray Optics")).not.toBeInTheDocument();
    expect(screen.getByTestId("catalogs-loading")).toHaveTextContent("not-loading");
    expect(mockProxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("shows the glass-catalog preload milestone while catalogs load", () => {
    mockProxy.getAllGlassCatalogsData.mockImplementationOnce(() => new Promise(() => undefined));

    renderInAppShellWithEmptyGlassCatalogs(<HomePage />);

    expect(screen.getByText("Preloading glass catalogs")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Initialization progress" })).toHaveAttribute("aria-valuenow", "90");
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("keeps the initialization overlay visible with the catalog error when preload fails", async () => {
    mockProxy.getAllGlassCatalogsData.mockRejectedValueOnce(new Error("Catalog preload failed"));

    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    expect(await screen.findAllByText("Catalog preload failed")).toHaveLength(2);
    expect(screen.getByText("Initializing Ray Optics")).toBeInTheDocument();
    expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent("not-loaded");
    expect(screen.getByTestId("catalogs-loading")).toHaveTextContent("not-loading");
    expect(screen.getByTestId("catalogs-error")).toHaveTextContent("Catalog preload failed");
    expect(screen.getByTestId("schott-count")).toHaveTextContent("0");
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("uses runtime initialization progress when a prior catalog error remains but the runtime is not ready", async () => {
    mockProxy.getAllGlassCatalogsData.mockRejectedValueOnce(new Error("Catalog preload failed"));
    const user = userEvent.setup();
    renderWithEmptyGlassCatalogs(
      <RerenderableAppShellHarness>
        <GlassCatalogStoreProbe />
      </RerenderableAppShellHarness>,
    );

    await screen.findAllByText("Catalog preload failed");
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });
    await user.click(screen.getByRole("button", { name: "Rerender shell" }));

    expect(screen.getByText("Loading Pyodide packages")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Initialization progress" })).toHaveAttribute("aria-valuenow", "40");
  });

  it("uses runtime progress instead of a stale catalog error when a proxy remains during runtime initialization", async () => {
    mockProxy.getAllGlassCatalogsData.mockRejectedValueOnce(new Error("Catalog preload failed"));
    const user = userEvent.setup();
    renderWithEmptyGlassCatalogs(
      <RerenderableAppShellHarness>
        <HomePage />
      </RerenderableAppShellHarness>,
    );

    await screen.findAllByText("Catalog preload failed");
    mockUsePyodide.mockReturnValue({
      proxy: mockProxy,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });
    await user.click(screen.getByRole("button", { name: "Rerender shell" }));

    expect(screen.getByText("Loading Pyodide packages")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Initialization progress" })).toHaveAttribute("aria-valuenow", "40");
  });

  it("does not show a catalog error overlay when the runtime reports ready without a proxy", async () => {
    mockProxy.getAllGlassCatalogsData.mockRejectedValueOnce(new Error("Catalog preload failed"));
    const user = userEvent.setup();
    renderWithEmptyGlassCatalogs(
      <RerenderableAppShellHarness>
        <GlassCatalogStoreProbe />
      </RerenderableAppShellHarness>,
    );

    await screen.findAllByText("Catalog preload failed");
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: true,
      error: undefined,
      initProgress: { value: 100, status: "Ready" },
    });
    await user.click(screen.getByRole("button", { name: "Rerender shell" }));

    expect(screen.queryByText("Initializing Ray Optics")).not.toBeInTheDocument();
    expect(screen.getByTestId("catalogs-error")).toHaveTextContent("Catalog preload failed");
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

  it("navigates directly when an unapplied result exists outside Optimization", async () => {
    mockPathname = "/";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));

    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/glass-map");
  });

  it("navigates directly from Optimization when no result is waiting to be applied", async () => {
    mockPathname = "/optimization";
    const user = userEvent.setup();
    renderInAppShell(<div>Optimization body</div>);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));

    expect(mockPush).toHaveBeenCalledWith("/glass-map");
  });

  it("does not guard a navigation that stays on Optimization", async () => {
    mockPathname = "/optimization";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Optimization" }));

    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/optimization");
  });

  it("uses the current router after the shell rerenders", async () => {
    const nextPush = jest.fn<void, [string]>();
    const user = userEvent.setup();
    renderWithStores(
      <RerenderableAppShellHarness>
        <div>Route body</div>
      </RerenderableAppShellHarness>,
    );

    mockRouter = { push: nextPush, replace: mockReplace };
    await user.click(screen.getByRole("button", { name: "Rerender shell" }));
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));

    expect(nextPush).toHaveBeenCalledWith("/glass-map");
    expect(mockPush).not.toHaveBeenCalled();
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

  it("dismisses the warning without applying or navigating when the model is missing", async () => {
    mockPathname = "/optimization";
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationWithoutModel />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));

    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("leaves the warning open when the worker proxy is unavailable", async () => {
    mockPathname = "/optimization";
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));

    expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("keeps an auto-aperture optimization result unapplied and does not navigate when synchronization fails", async () => {
    mockPathname = "/optimization";
    mockSelectedSegment = "optimization";
    mockProxy.getSurfaceSemiDiameters.mockRejectedValueOnce(new Error("sd failed"));
    const user = userEvent.setup();
    const { optimizationStore } = renderInAppShellWithOptimizationStore(
      <>
        <SeedUnappliedOptimizationResult model={{ ...optimizationGuardModel, setAutoAperture: "autoAperture" }} />
        <LensEditorRadiusProbe />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Glass Map" }));
    await user.click(screen.getByRole("button", { name: "Apply to Editor" }));

    expect(await screen.findByRole("dialog", { name: "Error" })).toBeInTheDocument();
    expect(screen.getByTestId("editor-radius")).toHaveTextContent("0");
    expect(optimizationStore.getState().hasUnappliedOptimizationResult).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("intercepts guarded browser history before Next routing handles it", async () => {
    mockPathname = "/optimization";
    const optimizationHistoryState = { __NA: true, tree: ["optimization"] };
    window.history.pushState(optimizationHistoryState, "", "/optimization?mode=local#results");
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    const nextRouterPopstateListener = jest.fn();
    window.addEventListener("popstate", nextRouterPopstateListener);
    const nativePushState = window.history.pushState.bind(window.history);
    const nextPatchedPushState = jest
      .spyOn(window.history, "pushState")
      .mockImplementation((state: unknown, unused: string, url?: string | URL | null) => {
        nativePushState(state, unused, url);
        if (!(typeof state === "object" && state !== null && "__NA" in state)) {
          nextRouterPopstateListener();
        }
      });

    try {
      renderInAppShell(<SeedUnappliedOptimizationResult />);
      await screen.findByText("Optimization body");

      nativePushState({ __NA: true, tree: ["editor"] }, "", "/");
      fireEvent(window, new PopStateEvent("popstate", {
        state: { __NA: true, tree: ["editor"] },
      }));

      expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
      expect(screen.getByText("Optimization body")).toBeInTheDocument();
      expect(window.location.pathname).toBe("/optimization");
      expect(window.location.search).toBe("?mode=local");
      expect(window.location.hash).toBe("#results");
      expect(window.history.state).toEqual(optimizationHistoryState);
      expect(nextRouterPopstateListener).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally {
      nextPatchedPushState.mockRestore();
      window.removeEventListener("popstate", nextRouterPopstateListener);
      confirmSpy.mockRestore();
    }
  });

  it("stays on Optimization after cancelling guarded browser history navigation", async () => {
    mockPathname = "/optimization";
    window.history.pushState({}, "", "/optimization?mode=local#results");
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);
    await screen.findByText("Optimization body");

    window.history.pushState({}, "", "/glass-map?catalog=Schott#details");
    fireEvent(window, new PopStateEvent("popstate"));
    await user.click(await screen.findByRole("button", { name: "Stay" }));

    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(window.location.href).toContain("/optimization?mode=local#results");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("leaves for the saved browser history destination after confirmation", async () => {
    mockPathname = "/optimization";
    window.history.pushState({}, "", "/optimization");
    const user = userEvent.setup();
    renderInAppShell(<SeedUnappliedOptimizationResult />);
    await screen.findByText("Optimization body");

    window.history.pushState({}, "", "/glass-map?catalog=Schott#details");
    fireEvent(window, new PopStateEvent("popstate"));
    await user.click(await screen.findByRole("button", { name: "Leave" }));

    expect(mockPush).toHaveBeenCalledWith("/glass-map?catalog=Schott#details");
  });

  it("applies the result before leaving for the saved browser history destination", async () => {
    mockPathname = "/optimization";
    window.history.pushState({}, "", "/optimization");
    const user = userEvent.setup();
    const { optimizationStore } = renderInAppShellWithOptimizationStore(
      <>
        <SeedUnappliedOptimizationResult />
        <LensEditorRadiusProbe />
      </>,
    );
    await screen.findByText("Optimization body");

    window.history.pushState({}, "", "/?view=editor#surface-data");
    fireEvent(window, new PopStateEvent("popstate"));
    await user.click(await screen.findByRole("button", { name: "Apply to Editor" }));

    expect(screen.getByTestId("editor-radius")).toHaveTextContent("42");
    expect(optimizationStore.getState().hasUnappliedOptimizationResult).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/?view=editor#surface-data");
  });

  it("allows browser history navigation within the app without native confirmation", () => {
    mockPathname = "/glass-map";
    window.history.pushState({}, "", "/glass-map?catalog=Schott#details");
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    renderInAppShell(<GlassMapPage />);

    window.history.pushState({}, "", "/settings?tab=display#theme");
    const downstreamPopstateListener = jest.fn();
    window.addEventListener("popstate", downstreamPopstateListener);
    fireEvent(window, new PopStateEvent("popstate"));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(downstreamPopstateListener).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/settings");
    expect(window.location.search).toBe("?tab=display");
    expect(window.location.hash).toBe("#theme");
    window.removeEventListener("popstate", downstreamPopstateListener);
    confirmSpy.mockRestore();
  });

  it("tracks sequential history transitions before guarding a later departure", async () => {
    mockPathname = "/glass-map";
    window.history.pushState({ step: 0 }, "", "/glass-map?step=0#first");
    const user = userEvent.setup();
    const optimizationStore = createStore<OptimizationState>(createOptimizationSlice);
    optimizationStore.setState({
      optimizationModel: optimizationGuardModel,
      hasUnappliedOptimizationResult: true,
    });
    renderInAppShellWithOptimizationStore(<div>Route body</div>, optimizationStore);

    window.history.pushState({ step: 1 }, "", "/settings?step=1#second");
    fireEvent(window, new PopStateEvent("popstate", { state: { step: 1 } }));
    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/settings");
    window.history.pushState({ step: 2 }, "", "/optimization?step=2#third");
    fireEvent(window, new PopStateEvent("popstate", { state: { step: 2 } }));
    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/optimization");
    window.history.pushState({ step: 2.5 }, "", "/optimization?step=2.5#same-route");
    fireEvent(window, new PopStateEvent("popstate", { state: { step: 2.5 } }));
    expect(screen.queryByRole("dialog", { name: "Unapplied Optimization Result" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?step=2.5");
    window.history.pushState({ step: 3 }, "", "/glass-map?step=3#fourth");
    fireEvent(window, new PopStateEvent("popstate", { state: { step: 3 } }));

    expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
    expect(window.location.href).toContain("/optimization?step=2.5#same-route");
    expect(window.history.state).toEqual({ step: 2.5 });
    await user.click(screen.getByRole("button", { name: "Leave" }));

    expect(mockPush).toHaveBeenCalledWith("/glass-map?step=3#fourth");
  });

  it("rebinds the history guard when the optimization store changes", async () => {
    mockPathname = "/optimization";
    window.history.pushState({}, "", "/optimization");
    const initialStore = createStore<OptimizationState>(createOptimizationSlice);
    const nextStore = createStore<OptimizationState>(createOptimizationSlice);
    nextStore.setState({
      optimizationModel: optimizationGuardModel,
      hasUnappliedOptimizationResult: true,
    });
    const user = userEvent.setup();
    renderWithStores(
      <OptimizationStoreSwapHarness initialStore={initialStore} nextStore={nextStore}>
        <div>Route body</div>
      </OptimizationStoreSwapHarness>,
    );

    await user.click(screen.getByRole("button", { name: "Swap optimization store" }));
    window.history.pushState({}, "", "/glass-map");
    fireEvent(window, new PopStateEvent("popstate", { state: {} }));

    expect(screen.getByRole("dialog", { name: "Unapplied Optimization Result" })).toBeInTheDocument();
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

  it("preloads glass catalog data into the glass-map store while rendering the home route", async () => {
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce({
      Schott: {
        "N-BK7": {
          refractiveIndexD: 1.5168,
          refractiveIndexE: 1.519,
          abbeNumberD: 64.17,
          abbeNumberE: 63.96,
          partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
          dispersionCoeffKind: "Sellmeier3T",
          dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
        },
      },
      CDGM: {}, Hikari: {}, Hoya: {}, Ohara: {}, Sumita: {}, Special: {},
    });

    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("schott-count")).toHaveTextContent("1");
    expect(screen.getByTestId("lookup-medium")).toHaveTextContent("Schott");
    expect(screen.getByTestId("context-lookup-medium")).toHaveTextContent("Schott");
  });

  it("reports successful preload status even when the store commit is unavailable", async () => {
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);

    const rendered = renderInAppShellWithCatalogCommitDisabled(<GlassCatalogStoreProbe />);

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    await waitFor(() => expect(screen.getByTestId("catalogs-loading")).toHaveTextContent("not-loading"));
    expect(rendered.glassMapStore.getState().catalogsData).toBeUndefined();
    expect(screen.getByTestId("schott-count")).toHaveTextContent("0");
    expect(screen.queryByText("Initializing Ray Optics")).not.toBeInTheDocument();
  });

  it("hydrates persisted custom glasses into Python before marking catalogs loaded", async () => {
    mockStoredCustomGlassRows = [{
      label: "PERSISTED",
      type: "tabulated",
      pairs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
    }];
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);
    mockProxy.addUserDefinedGlasses.mockResolvedValueOnce({ PERSISTED: persistedCustomGlassData });

    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    await waitFor(() => expect(mockProxy.addUserDefinedGlasses).toHaveBeenCalledWith([{
      name: "PERSISTED",
      pairs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
    }]));
    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(screen.getByTestId("custom-count")).toHaveTextContent("1");
  });

  it("quarantines invalid persisted custom glasses while valid rows still load", async () => {
    mockStoredCustomGlassRows = [
      {
        label: "VALID",
        type: "tabulated",
        pairs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
      },
      { label: "BAD_TYPE", type: "sellmeier", pairs: [] },
    ];
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);
    mockProxy.addUserDefinedGlasses.mockResolvedValueOnce({ VALID: persistedCustomGlassData });

    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    expect(await screen.findByText(/1 persisted custom glass entry was quarantined: BAD_TYPE/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(screen.getByTestId("custom-count")).toHaveTextContent("1");
    expect(mockQuarantineStoredCustomGlassRow).toHaveBeenCalledWith({ label: "BAD_TYPE", type: "sellmeier", pairs: [] }, "BAD_TYPE");
  });

  it("preserves built-in custom glasses while hydrating persisted custom glasses", async () => {
    const catalogsWithBuiltInCustom = {
      ...loadedCatalogsData,
      Custom: { BUILT_IN: persistedCustomGlassData },
    } satisfies AllGlassCatalogsData;
    const persistedRow = {
      label: "PERSISTED",
      type: "tabulated",
      pairs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
    };
    mockStoredCustomGlassRows = [persistedRow];
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(catalogsWithBuiltInCustom);
    mockProxy.addUserDefinedGlasses.mockResolvedValueOnce({ PERSISTED: persistedCustomGlassData });

    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(screen.getByTestId("custom-count")).toHaveTextContent("2");
  });

  it("quarantines worker-rejected persisted glasses and dismisses the plural warning", async () => {
    const persistedRow = {
      label: "REJECTED",
      type: "tabulated",
      pairs: [[587.56, 1.7], [486.13, 1.71], [546.07, 1.705], [656.27, 1.695]],
    };
    mockStoredCustomGlassRows = [persistedRow];
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);
    mockProxy.addUserDefinedGlasses.mockRejectedValueOnce(new Error("worker rejected row"));

    const user = userEvent.setup();
    renderInAppShellWithEmptyGlassCatalogs(<HomePage />);

    expect(await screen.findByText(/1 persisted custom glass entry was quarantined: REJECTED/)).toBeInTheDocument();
    expect(mockQuarantinePersistedCustomGlass).toHaveBeenCalledWith(persistedRow);
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByText(/persisted custom glass entry was quarantined/)).not.toBeInTheDocument();
  });

  it("labels multiple quarantined rows with plural text and preserves their order", async () => {
    mockStoredCustomGlassRows = [
      { label: "BAD_ONE", type: "sellmeier", pairs: [] },
      { label: "BAD_TWO", type: "unknown", pairs: [] },
    ];
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);

    renderInAppShellWithEmptyGlassCatalogs(<HomePage />);

    expect(await screen.findByText(/2 persisted custom glass entries were quarantined: BAD_ONE, BAD_TWO/)).toBeInTheDocument();
    expect(mockQuarantineStoredCustomGlassRow).toHaveBeenCalledWith(
      { label: "BAD_ONE", type: "sellmeier", pairs: [] },
      "BAD_ONE",
    );
    expect(mockQuarantineStoredCustomGlassRow).toHaveBeenCalledWith(
      { label: "BAD_TWO", type: "unknown", pairs: [] },
      "BAD_TWO",
    );
  });

  it("uses an unlabeled fallback for malformed persisted rows", async () => {
    mockStoredCustomGlassRows = [null, { label: 42, type: "sellmeier", pairs: [] }, "malformed row"];
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);

    renderInAppShellWithEmptyGlassCatalogs(<HomePage />);

    expect(await screen.findByText(/3 persisted custom glass entries were quarantined: unlabeled, unlabeled, unlabeled/)).toBeInTheDocument();
    expect(mockQuarantineStoredCustomGlassRow).toHaveBeenNthCalledWith(1, null, "unlabeled");
    expect(mockQuarantineStoredCustomGlassRow).toHaveBeenNthCalledWith(2, { label: 42, type: "sellmeier", pairs: [] }, "unlabeled");
    expect(mockQuarantineStoredCustomGlassRow).toHaveBeenNthCalledWith(3, "malformed row", "unlabeled");
  });

  it("continues catalog startup when persisted-glass storage cannot be read", async () => {
    mockReadStoredCustomGlassRows.mockRejectedValueOnce(new Error("storage unavailable"));
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce(loadedCatalogsData);

    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(screen.getByTestId("custom-count")).toHaveTextContent("0");
    expect(screen.queryByRole("dialog", { name: "Error" })).not.toBeInTheDocument();
  });

  it("uses existing glass-map store catalog data without refetching on initial preload", async () => {
    renderInAppShellWithSeededGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <HomePage />
      </>,
    );

    expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/);
    expect(screen.getByTestId("schott-count")).toHaveTextContent("1");
    expect(screen.queryByText("Preloading glass catalogs")).not.toBeInTheDocument();
    expect(mockProxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("returns existing mutable store catalog data from context preload without refetching", async () => {
    const user = userEvent.setup();
    renderInAppShellWithSeededGlassCatalogs(
      <>
        <GlassCatalogPreloadProbe />
        <HomePage />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Preload catalogs" }));

    expect(await screen.findByTestId("preload-result")).toHaveTextContent("store-data");
    expect(mockProxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("retains the loaded status when catalog data is cleared after a successful cached preload", async () => {
    const user = userEvent.setup();
    renderInAppShell(<ClearCatalogDataAfterPreloadProbe />);

    await user.click(screen.getByRole("button", { name: "Clear catalog data after preload" }));

    await waitFor(() => expect(screen.getByTestId("cleared-catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(screen.getByTestId("cleared-catalogs-loading")).toHaveTextContent("not-loading");
    expect(screen.queryByText("Preloading glass catalogs")).not.toBeInTheDocument();
  });

  it("marks a manual preload loaded even when its catalog commit is unavailable", async () => {
    const user = userEvent.setup();
    renderInAppShellWithCatalogCommitDisabled(
      <>
        <GlassCatalogStoreProbe />
        <GlassCatalogPreloadProbe />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    await user.click(screen.getByRole("button", { name: "Preload catalogs" }));

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(screen.getByTestId("catalogs-loading")).toHaveTextContent("not-loading");
  });

  it("returns undefined from manual preload when the worker proxy is unavailable", async () => {
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: true,
      error: undefined,
      initProgress: { value: 100, status: "Ready" },
    });
    const user = userEvent.setup();
    renderInAppShell(<GlassCatalogPreloadProbe />);

    await user.click(screen.getByRole("button", { name: "Preload catalogs" }));

    expect(await screen.findByTestId("preload-result")).toHaveTextContent("other");
    expect(mockProxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("supports manual preload success while the automatic request is in flight", async () => {
    let resolveCatalogs: ((data: AllGlassCatalogsData) => void) | undefined;
    mockProxy.getAllGlassCatalogsData.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveCatalogs = resolve;
      }),
    );
    const user = userEvent.setup();
    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <GlassCatalogPreloadProbe />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Preload catalogs" }));
    expect(screen.getByRole("progressbar", { name: "Initialization progress" })).toHaveAttribute("aria-valuenow", "90");
    resolveCatalogs?.(loadedCatalogsData);

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("schott-count")).toHaveTextContent("1");
  });

  it("reports manual preload errors through the catalog context and overlay", async () => {
    let rejectCatalogs: ((error: Error) => void) | undefined;
    mockProxy.getAllGlassCatalogsData.mockImplementationOnce(
      () => new Promise((_resolve, reject) => {
        rejectCatalogs = reject;
      }),
    );
    const user = userEvent.setup();
    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <GlassCatalogPreloadProbe />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Preload catalogs" }));
    rejectCatalogs?.(new Error("Manual preload failed"));

    expect(await screen.findAllByText("Manual preload failed")).toHaveLength(2);
    expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent("not-loaded");
    expect(screen.getByTestId("catalogs-loading")).toHaveTextContent("not-loading");
    expect(screen.getByTestId("catalogs-error")).toHaveTextContent("Manual preload failed");
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("uses the updated catalog context after automatic preload completes", async () => {
    const user = userEvent.setup();
    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <GlassCatalogPreloadProbe />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    await user.click(screen.getByRole("button", { name: "Preload catalogs" }));

    expect(await screen.findByTestId("preload-result")).toHaveTextContent("store-data");
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("starts catalog preload when runtime dependencies become ready after a rerender", async () => {
    mockUsePyodide.mockReturnValue({
      proxy: undefined,
      isReady: false,
      error: undefined,
      initProgress: { value: 40, status: "Loading Pyodide packages" },
    });
    const user = userEvent.setup();
    renderWithEmptyGlassCatalogs(
      <RerenderableAppShellHarness>
        <GlassCatalogStoreProbe />
      </RerenderableAppShellHarness>,
    );

    mockUsePyodide.mockReturnValue({
      proxy: mockProxy,
      isReady: true,
      error: undefined,
      initProgress: { value: 100, status: "Ready" },
    });
    await user.click(screen.getByRole("button", { name: "Rerender shell" }));

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("does not commit catalog data after the shell unmounts during preload", async () => {
    let resolveCatalogs: ((data: AllGlassCatalogsData) => void) | undefined;
    mockProxy.getAllGlassCatalogsData.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveCatalogs = resolve;
      }),
    );
    const rendered = renderInAppShellWithEmptyGlassCatalogs(<HomePage />);
    rendered.unmount();
    resolveCatalogs?.(loadedCatalogsData);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(rendered.glassMapStore.getState().catalogsData).toBeUndefined();
  });

  it("renders the glass map on the glass-map route", async () => {
    renderInAppShellWithEmptyGlassCatalogs(
      <>
        <GlassCatalogStoreProbe />
        <GlassMapPage />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId("catalogs-loaded")).toHaveTextContent(/^loaded$/));
    expect(mockProxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("passes MediumSelectorModal route intent from search params into the glass map page", async () => {
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");

    renderInAppShell(<GlassMapPage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Back to lens editor" })).toHaveAttribute("href", "/");
    });
  });

  it.each([
    ["missing source", "catalog=Schott&glass=N-BK7", false],
    ["wrong source", "source=other&catalog=Schott&glass=N-BK7", false],
    ["missing catalog", "source=medium-selector&glass=N-BK7", false],
    ["missing glass", "source=medium-selector&catalog=Schott", false],
    ["complete intent", "source=medium-selector&catalog=Schott&glass=N-BK7", true],
  ])("parses the Glass Map route intent truth table: %s", async (_label, query, hasRouteIntent) => {
    mockSearchParams = new URLSearchParams(query);
    renderInAppShell(<GlassMapPage />);

    if (hasRouteIntent) {
      expect(await screen.findByRole("link", { name: "Back to lens editor" })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole("link", { name: "Back to lens editor" })).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "N-BK7", level: 3 })).not.toBeInTheDocument();
      });
    }
  });

  it("does not expose Use selected glass without a pending medium selection", async () => {
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");
    renderInAppShell(<GlassMapPage />);

    await screen.findByRole("link", { name: "Back to lens editor" });
    expect(screen.queryByRole("link", { name: "Use selected glass" })).not.toBeInTheDocument();
  });

  it("updates the route intent when search params rerender", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams();
    renderInAppShell(<SearchParamsRerenderHarness />);

    expect(screen.queryByRole("link", { name: "Back to lens editor" })).not.toBeInTheDocument();
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");
    await user.click(screen.getByRole("button", { name: "Rerender search params" }));

    expect(await screen.findByRole("link", { name: "Back to lens editor" })).toBeInTheDocument();
  });

  it("remounts route-intent-local state when the selected URL glass changes", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");
    renderWithGlassCatalogs(
      <OptimizationStoreProvider>
        <AppShell>
          <SearchParamsRerenderHarness />
        </AppShell>
      </OptimizationStoreProvider>,
      catalogsWithSecondSchottGlass,
    );

    expect(await screen.findByText("N-BK7", { selector: "h3" })).toBeInTheDocument();
    const glassInput = screen.getByLabelText("Glass");
    await user.clear(glassInput);
    await user.type(glassInput, "N-F2");
    await user.click(screen.getByRole("button", { name: "Select glass" }));
    expect(screen.getByText("N-F2", { selector: "h3" })).toBeInTheDocument();

    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-F2");
    await user.click(screen.getByRole("button", { name: "Rerender search params" }));
    expect(await screen.findByText("N-F2", { selector: "h3" })).toBeInTheDocument();

    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");
    await user.click(screen.getByRole("button", { name: "Rerender search params" }));

    expect(await screen.findByText("N-BK7", { selector: "h3" })).toBeInTheDocument();
  });

  it("copies the selected glass into the pending modal draft without committing the row", async () => {
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");
    mockProxy.getAllGlassCatalogsData.mockResolvedValueOnce({
      Schott: {
        "N-BK7": {
          refractiveIndexD: 1.5168,
          refractiveIndexE: 1.519,
          abbeNumberD: 64.17,
          abbeNumberE: 63.96,
          partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
          dispersionCoeffKind: "Sellmeier3T",
          dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
        },
      },
      CDGM: {}, Hikari: {}, Hoya: {}, Ohara: {}, Sumita: {}, Special: {},
    });
    renderInAppShell(
      <>
        <SeedPendingMediumSelection />
        <GlassMapPage />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId("pending-medium")).toHaveTextContent("air"));

    await userEvent.click(await screen.findByRole("link", { name: "Use selected glass" }));

    expect(screen.getByTestId("pending-medium")).toHaveTextContent("N-BK7");
    expect(screen.getByTestId("pending-manufacturer")).toHaveTextContent("Schott");
    expect(screen.getByTestId("confirmed-medium")).toHaveTextContent("air");
  });

  it("keeps the pending modal draft unchanged when using Back to lens editor", async () => {
    mockSearchParams = new URLSearchParams("source=medium-selector&catalog=Schott&glass=N-BK7");
    renderInAppShell(
      <>
        <SeedPendingMediumSelection />
        <GlassMapPage />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId("pending-medium")).toHaveTextContent("air"));

    await userEvent.click(await screen.findByRole("link", { name: "Back to lens editor" }));

    expect(screen.getByTestId("pending-medium")).toHaveTextContent("air");
    expect(screen.getByTestId("pending-manufacturer")).toHaveTextContent("none");
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
    const error = new Error("bad input");
    const consoleLog = jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockGetFirstOrderData.mockRejectedValueOnce(error);
    renderInAppShell(<HomePage />);

    await userEvent.click(screen.getByRole("tab", { name: "Prescription" }));
    await userEvent.click(screen.getByRole("button", { name: "Update System" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(consoleLog).toHaveBeenCalledWith("Update System failed:", error);
    consoleLog.mockRestore();
  });
});
