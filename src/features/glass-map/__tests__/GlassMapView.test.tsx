import React, { Suspense, act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand/vanilla";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import { GlassMapStoreContext } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { createGlassMapSlice, type GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { RawAllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import { _resetGlassCatalogsResourceForTest } from "@/features/glass-map/lib/glassCatalogsResource";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

const rawData: RawAllGlassCatalogsData = {
  Schott: {
    "N-BK7": {
      refractive_index_d: 1.5168,
      refractive_index_e: 1.519,
      abbe_number_d: 64.17,
      abbe_number_e: 63.96,
      partial_dispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
      dispersion_coeff_kind: 'Sellmeier3T' as const,
      dispersion_coeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
    },
  },
  CDGM: {},
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Sumita: {},
};

function makeProxy(overrides?: Partial<PyodideWorkerAPI>): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    getRayFanData: jest.fn().mockResolvedValue([]),
    getOpdFanData: jest.fn().mockResolvedValue([]),
    getSpotDiagramData: jest.fn().mockResolvedValue([]),
    getWavefrontData: jest.fn().mockResolvedValue({
      fieldIdx: 0,
      wvlIdx: 0,
      x: [0],
      y: [0],
      z: [[0]],
      unitX: "",
      unitY: "",
      unitZ: "waves",
    }),
    getGeoPSFData: jest.fn().mockResolvedValue({
      fieldIdx: 0,
      wvlIdx: 0,
      x: [0],
      y: [0],
      unitX: "mm",
      unitY: "mm",
    }),
    getDiffractionPSFData: jest.fn().mockResolvedValue({
      fieldIdx: 0,
      wvlIdx: 0,
      x: [0],
      y: [0],
      z: [[1]],
      unitX: "mm",
      unitY: "mm",
      unitZ: "",
    }),
    getDiffractionMTFData: jest.fn().mockResolvedValue({
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
    }),
    get3rdOrderSeidelData: jest.fn(),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    getAllGlassCatalogsData: jest.fn().mockResolvedValue(rawData),
    evaluateOptimizationProblem: jest.fn(),
    optimizeOpm: jest.fn(),
    ...overrides,
  };
}

function makeStore() {
  return createStore<GlassMapStore>(createGlassMapSlice);
}

function renderWithStore(
  ui: React.ReactElement,
  store = makeStore()
) {
  return render(
    <GlassMapStoreContext.Provider value={store}>
      <Suspense fallback={<div>Loading glass catalog data…</div>}>
        {ui}
      </Suspense>
    </GlassMapStoreContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetGlassCatalogsResourceForTest();
});

describe("GlassMapView", () => {
  it("shows loading indicator when isReady=false", () => {
    renderWithStore(<GlassMapView proxy={undefined} isReady={false} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows loading indicator on first render when isReady=true but catalogsData not yet fetched", () => {
    const proxy = makeProxy();
    // catalogsData is undefined in the initial store state
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("calls getAllGlassCatalogsData on mount when isReady=true", async () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(proxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
  });

  it("dedupes getAllGlassCatalogsData in React.StrictMode", async () => {
    const proxy = makeProxy();
    renderWithStore(
      <React.StrictMode>
        <GlassMapView proxy={proxy} isReady={true} />
      </React.StrictMode>
    );

    await waitFor(() => {
      expect(proxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call getAllGlassCatalogsData again if the resource is already loaded", async () => {
    const proxy = makeProxy();
    const { unmount } = renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);

    await waitFor(() => {
      expect(proxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });

    unmount();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);

    await new Promise((r) => setTimeout(r, 50));
    expect(proxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
  });

  it("shows error message when data loading fails", async () => {
    const proxy = makeProxy({
      getAllGlassCatalogsData: jest.fn().mockRejectedValue(new Error("Network error")),
    });
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("renders GlassMapControls after data loads", async () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /refractive index/i })).toBeInTheDocument();
    });
  });

  it("renders GlassDetailPanel after data loads", async () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByText(/select a glass/i)).toBeInTheDocument();
    });
  });

  it("does not render its own MathJaxContext (context is provided by parent)", async () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByText(/select a glass/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });

  it("auto-selects a requested glass after data loads", async () => {
    const proxy = makeProxy();
    const routeIntent = {
      source: "medium-selector" as const,
      catalog: "Schott",
      glass: "N-BK7",
    };
    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={routeIntent}
      />,
      makeStore(),
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    });
  });

  it("re-enables the requested catalog when restoring a selected glass", async () => {
    const proxy = makeProxy();
    const routeIntent = {
      source: "medium-selector" as const,
      catalog: "Schott",
      glass: "N-BK7",
    };
    const store = makeStore();
    act(() => {
      store.getState().toggleCatalog("Schott");
    });

    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={routeIntent}
      />,
      store,
    );

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Schott" })).toBeChecked();
    });
  });

  it("does not overwrite the current selection when the requested glass is missing", async () => {
    const proxy = makeProxy();
    const store = makeStore();

    act(() => {
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
      });
    });

    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Ohara", glass: "Missing" }}
      />,
      store,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    });
  });

  it("renders a back-to-lens-editor link when opened from MediumSelectorModal", async () => {
    const proxy = makeProxy();
    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Back to lens editor" })).toHaveAttribute("href", "/");
    });
  });

  it("does not render a back link without MediumSelectorModal route intent", async () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);

    await waitFor(() => {
      expect(screen.getByText(/select a glass/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("link", { name: "Back to lens editor" })).not.toBeInTheDocument();
  });

  it("applies route intent from preloaded store data on the first render", async () => {
    const proxy = makeProxy();
    const routeIntent = {
      source: "medium-selector" as const,
      catalog: "Schott",
      glass: "N-BK7",
    };

    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={routeIntent}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    });
  });

  it("lets user selection override the route-intent selection after interaction", async () => {
    const proxy = makeProxy({
      getAllGlassCatalogsData: jest.fn().mockResolvedValue({
        ...rawData,
        Schott: {
          ...rawData.Schott,
          "N-SF6": {
            refractive_index_d: 1.80518,
            refractive_index_e: 1.8163,
            abbe_number_d: 25.36,
            abbe_number_e: 25.2,
            partial_dispersions: { P_g_F: 0.6439, P_F_d: 0.305, P_F_e: 0.298 },
            dispersion_coeff_kind: "Sellmeier3T" as const,
            dispersion_coeffs: [1.72448482, 0.390104889, 1.04572858, 0.0134871947, 0.0569318095, 118.557185],
          },
        },
      }),
    });
    const store = makeStore();

    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
      />,
      store,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("radio", { name: "Partial Dispersion" }));

    act(() => {
      store.getState().setSelectedGlass({
        catalogName: "Schott",
        glassName: "N-SF6",
        data: {
          refractiveIndexD: 1.80518,
          refractiveIndexE: 1.8163,
          abbeNumberD: 25.36,
          abbeNumberE: 25.2,
          partialDispersions: { P_g_F: 0.6439, P_F_d: 0.305, P_F_e: 0.298 },
          dispersionCoeffKind: "Sellmeier3T",
          dispersionCoeffs: [1.72448482, 0.390104889, 1.04572858, 0.0134871947, 0.0569318095, 118.557185],
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-SF6" })).toBeInTheDocument();
    });
  });
});
