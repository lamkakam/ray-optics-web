import React, { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import { GlassMapStoreContext } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { createGlassMapSlice, type GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { RawAllGlassCatalogsData } from "@/shared/lib/types/glassMap";

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
    plotRayFan: jest.fn(),
    plotOpdFan: jest.fn(),
    plotSpotDiagram: jest.fn(),
    plotSurfaceBySurface3rdOrderAberr: jest.fn(),
    plotWavefrontMap: jest.fn(),
    plotGeoPSF: jest.fn(),
    plotDiffractionPSF: jest.fn(),
    get3rdOrderSeidelData: jest.fn(),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    getAllGlassCatalogsData: jest.fn().mockResolvedValue(rawData),
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
      {ui}
    </GlassMapStoreContext.Provider>
  );
}

beforeEach(() => jest.clearAllMocks());

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

  it("does not call getAllGlassCatalogsData if data already loaded", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    // pre-populate store
    const { normalizeAllCatalogsData } = await import("@/shared/lib/types/glassMap");
    store.getState().setCatalogsData(normalizeAllCatalogsData(rawData));
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />, store);
    await new Promise((r) => setTimeout(r, 50));
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
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
    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    });
  });

  it("re-enables the requested catalog when restoring a selected glass", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    act(() => {
      store.getState().toggleCatalog("Schott");
    });

    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
      />,
      store,
    );

    await waitFor(() => {
      expect(store.getState().enabledCatalogs.Schott).toBe(true);
    });
  });

  it("does not overwrite the current selection when the requested glass is missing", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    const { normalizeAllCatalogsData } = await import("@/shared/lib/types/glassMap");

    act(() => {
      store.getState().setCatalogsData(normalizeAllCatalogsData(rawData));
      store.getState().setSelectedGlass({
        catalogName: "Schott",
        glassName: "N-BK7",
        data: normalizeAllCatalogsData(rawData).Schott["N-BK7"],
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

    expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
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
});
