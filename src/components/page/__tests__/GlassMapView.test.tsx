import React, { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import { GlassMapView } from "@/components/page/GlassMapView";
import { createGlassMapSlice, type GlassMapStore } from "@/store/glassMapStore";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";
import type { RawAllGlassCatalogsData } from "@/lib/glassMap";

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-context">{children}</div>
  ),
  MathJax: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

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

beforeEach(() => jest.clearAllMocks());

describe("GlassMapView", () => {
  it("shows loading indicator when isReady=false", () => {
    const store = makeStore();
    render(<GlassMapView store={store} proxy={undefined} isReady={false} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows loading indicator on first render when isReady=true but catalogsData not yet fetched", () => {
    const proxy = makeProxy();
    const store = makeStore();
    // catalogsData is undefined in the initial store state
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("calls getAllGlassCatalogsData on mount when isReady=true", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(proxy.getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    });
  });

  it("does not call getAllGlassCatalogsData if data already loaded", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    // pre-populate store
    const { normalizeAllCatalogsData } = await import("@/lib/glassMap");
    store.getState().setCatalogsData(normalizeAllCatalogsData(rawData));
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("shows error message when data loading fails", async () => {
    const proxy = makeProxy({
      getAllGlassCatalogsData: jest.fn().mockRejectedValue(new Error("Network error")),
    });
    const store = makeStore();
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("renders GlassMapControls after data loads", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /refractive index/i })).toBeInTheDocument();
    });
  });

  it("renders GlassDetailPanel after data loads", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByText(/select a glass/i)).toBeInTheDocument();
    });
  });

  it("does not render its own MathJaxContext (context is provided by parent)", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    render(<GlassMapView store={store} proxy={proxy} isReady={true} />);
    await waitFor(() => {
      expect(screen.getByText(/select a glass/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("mathjax-context")).not.toBeInTheDocument();
  });
});
