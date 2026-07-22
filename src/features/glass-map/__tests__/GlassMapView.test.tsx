import React, { Suspense, act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand/vanilla";
import { GlassMapView } from "@/features/glass-map/GlassMapView";
import { GlassMapStoreContext } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { createGlassMapSlice, type GlassMapStore } from "@/features/glass-map/stores/glassMapStore";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { AllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import { _resetGlassCatalogLoaderForTest } from "@/features/glass-map/lib/glassCatalogLoader";
import { completeAllCatalogsData } from "@/features/glass-map/lib/glassMap";

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

const rawData: AllGlassCatalogsData = {
  Schott: {
    "N-BK7": {
      refractiveIndexD: 1.5168,
      refractiveIndexE: 1.519,
      abbeNumberD: 64.17,
      abbeNumberE: 63.96,
      partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
      dispersionCoeffKind: 'Sellmeier3T' as const,
      dispersionCoeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
    },
  },
  CDGM: {},
  Hikari: {},
  Hoya: {},
  Ohara: {},
  Sumita: {},
  Special: {},
};

function makeProxy(overrides?: Partial<PyodideWorkerAPI>): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    getSurfaceSemiDiameters: jest.fn().mockResolvedValue([]),
    plotLensLayout: jest.fn(),
    getRayFanData: jest.fn().mockResolvedValue([]),
    getOpdFanData: jest.fn().mockResolvedValue([]),
    getSpotDiagramData: jest.fn().mockResolvedValue([]),
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
    getLSAData: jest.fn().mockResolvedValue([]),
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
    addUserDefinedGlasses: jest.fn().mockResolvedValue({}),
    deleteUserDefinedGlasses: jest.fn().mockResolvedValue(undefined),
    updateUserDefinedGlasses: jest.fn().mockResolvedValue({}),
    getUserDefinedGlasses: jest.fn().mockResolvedValue({}),
    canInterruptOptimization: jest.fn().mockResolvedValue(true),
    requestOptimizationStop: jest.fn().mockResolvedValue({ signaled: true }),
    evaluateOptimizationProblem: jest.fn(),
    optimizeOpm: jest.fn(),
    optimizeGlasses: jest.fn(),
    ...overrides,
  };
}

const defaultCatalogsData = completeAllCatalogsData(rawData);

function makeStore(catalogsData?: AllGlassCatalogsData) {
  const store = createStore<GlassMapStore>(createGlassMapSlice);
  const resolvedCatalogsData = arguments.length === 0 ? defaultCatalogsData : catalogsData;

  if (resolvedCatalogsData !== undefined) {
    store.getState().setCatalogsData(resolvedCatalogsData);
  }

  return store;
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
  _resetGlassCatalogLoaderForTest();
});

describe("GlassMapView", () => {
  it("shows loading indicator when isReady=false", () => {
    renderWithStore(<GlassMapView proxy={undefined} isReady={false} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows loading indicator on first render when isReady=true but catalogsData not yet fetched", () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />, makeStore(undefined));
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("does not call getAllGlassCatalogsData on mount when isReady=true", async () => {
    const proxy = makeProxy();
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />);
    expect(await screen.findByText(/select a glass/i)).toBeInTheDocument();
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("does not fetch glass catalogs in React.StrictMode", async () => {
    const proxy = makeProxy();
    renderWithStore(
      <React.StrictMode>
        <GlassMapView proxy={proxy} isReady={true} />
      </React.StrictMode>
    );

    expect(await screen.findByText(/select a glass/i)).toBeInTheDocument();
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("renders from store catalog data without fetching the resource", async () => {
    const proxy = makeProxy();
    const store = makeStore();
    const catalogsData = completeAllCatalogsData(rawData);

    act(() => {
      store.getState().setCatalogsData(catalogsData);
    });

    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />, store);

    expect(await screen.findByText(/select a glass/i)).toBeInTheDocument();
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
  });

  it("keeps a loading placeholder when catalog data is unexpectedly unavailable", () => {
    const proxy = makeProxy({
      getAllGlassCatalogsData: jest.fn().mockRejectedValue(new Error("Network error")),
    });
    renderWithStore(<GlassMapView proxy={proxy} isReady={true} />, makeStore(undefined));

    expect(screen.getByText(/loading glass catalog data/i)).toBeInTheDocument();
    expect(proxy.getAllGlassCatalogsData).not.toHaveBeenCalled();
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
          partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
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

  it("applies the valid route-intent glass through the injected callback", async () => {
    const onUseSelectedGlass = jest.fn();
    renderWithStore(
      <GlassMapView
        proxy={makeProxy()}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
        onUseSelectedGlass={onUseSelectedGlass}
      />,
    );

    await userEvent.click(await screen.findByRole("link", { name: "Use selected glass" }));

    expect(onUseSelectedGlass).toHaveBeenCalledWith(
      expect.objectContaining({ glassName: "N-BK7", catalogName: "Schott" }),
    );
  });

  it("preserves and applies the route-intent glass after control changes", async () => {
    const onUseSelectedGlass = jest.fn();
    renderWithStore(
      <GlassMapView
        proxy={makeProxy()}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
        onUseSelectedGlass={onUseSelectedGlass}
      />,
    );

    await screen.findByRole("heading", { name: "N-BK7" });
    await userEvent.click(screen.getByRole("radio", { name: "Partial Dispersion" }));
    await userEvent.click(screen.getByRole("radio", { name: "e" }));
    await userEvent.click(screen.getByRole("radio", { name: "P_F,e" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Hoya" }));

    expect(screen.getByRole("heading", { name: "N-BK7" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Use selected glass" }));

    expect(onUseSelectedGlass).toHaveBeenCalledWith(
      expect.objectContaining({ glassName: "N-BK7", catalogName: "Schott" }),
    );
  });

  it("applies the newly selected glass instead of the original route glass", async () => {
    const onUseSelectedGlass = jest.fn();
    const proxy = makeProxy({
      getAllGlassCatalogsData: jest.fn().mockResolvedValue({
        ...rawData,
        Ohara: {
          "S-TIH6": {
            refractiveIndexD: 1.80518,
            refractiveIndexE: 1.8163,
            abbeNumberD: 25.36,
            abbeNumberE: 25.2,
            partialDispersions: { P_gF: 0.6439, P_Fd: 0.305, P_fe: 0.298 },
            dispersionCoeffKind: "Sellmeier3T" as const,
            dispersionCoeffs: [1.72448482, 0.390104889, 1.04572858, 0.0134871947, 0.0569318095, 118.557185],
          },
        },
      }),
    });
    const store = makeStore(completeAllCatalogsData({
      ...rawData,
      Ohara: {
        "S-TIH6": {
          refractiveIndexD: 1.80518,
          refractiveIndexE: 1.8163,
          abbeNumberD: 25.36,
          abbeNumberE: 25.2,
          partialDispersions: { P_gF: 0.6439, P_Fd: 0.305, P_fe: 0.298 },
          dispersionCoeffKind: "Sellmeier3T" as const,
          dispersionCoeffs: [1.72448482, 0.390104889, 1.04572858, 0.0134871947, 0.0569318095, 118.557185],
        },
      },
    }));
    renderWithStore(
      <GlassMapView
        proxy={proxy}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
        onUseSelectedGlass={onUseSelectedGlass}
      />,
      store,
    );
    await screen.findByRole("heading", { name: "N-BK7" });
    const unselectedPoint = screen
      .getAllByTestId("glass-point")
      .find((point) => point.getAttribute("stroke") === "none");
    expect(unselectedPoint).toBeDefined();
    fireEvent.click(unselectedPoint!);

    await userEvent.click(screen.getByRole("link", { name: "Use selected glass" }));

    expect(onUseSelectedGlass).toHaveBeenCalledWith(
      expect.objectContaining({ glassName: "S-TIH6", catalogName: "Ohara" }),
    );
  });

  it.each([
    ["without route intent", undefined, jest.fn()],
    ["without pending selection callback", { source: "medium-selector" as const, catalog: "Schott", glass: "N-BK7" }, undefined],
    ["without a valid selected glass", { source: "medium-selector" as const, catalog: "Schott", glass: "Missing" }, jest.fn()],
  ])("hides Use selected glass %s", async (_label, routeIntent, onUseSelectedGlass) => {
    renderWithStore(
      <GlassMapView
        proxy={makeProxy()}
        isReady={true}
        routeIntent={routeIntent}
        onUseSelectedGlass={onUseSelectedGlass}
      />,
    );
    await waitFor(() => expect(makeProxy).toBeDefined());

    expect(screen.queryByRole("link", { name: "Use selected glass" })).not.toBeInTheDocument();
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
            refractiveIndexD: 1.80518,
            refractiveIndexE: 1.8163,
            abbeNumberD: 25.36,
            abbeNumberE: 25.2,
            partialDispersions: { P_gF: 0.6439, P_Fd: 0.305, P_fe: 0.298 },
            dispersionCoeffKind: "Sellmeier3T" as const,
            dispersionCoeffs: [1.72448482, 0.390104889, 1.04572858, 0.0134871947, 0.0569318095, 118.557185],
          },
        },
      }),
    });
    const store = makeStore(completeAllCatalogsData({
      ...rawData,
      Schott: {
        ...rawData.Schott,
        "N-SF6": {
          refractiveIndexD: 1.80518,
          refractiveIndexE: 1.8163,
          abbeNumberD: 25.36,
          abbeNumberE: 25.2,
          partialDispersions: { P_gF: 0.6439, P_Fd: 0.305, P_fe: 0.298 },
          dispersionCoeffKind: "Sellmeier3T" as const,
          dispersionCoeffs: [1.72448482, 0.390104889, 1.04572858, 0.0134871947, 0.0569318095, 118.557185],
        },
      },
    }));

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

    const unselectedPoint = screen
      .getAllByTestId("glass-point")
      .find((point) => point.getAttribute("stroke") === "none");
    expect(unselectedPoint).toBeDefined();
    fireEvent.click(unselectedPoint!);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "N-SF6" })).toBeInTheDocument();
    });
  });

  it("selects a glass from the catalog selector and updates the detail panel", async () => {
    const store = makeStore();
    renderWithStore(<GlassMapView proxy={makeProxy()} isReady={true} />, store);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Schott");
    await userEvent.type(screen.getByRole("combobox", { name: "Glass" }), "n-bk7");
    await userEvent.click(screen.getByRole("button", { name: "Select glass" }));

    expect(await screen.findByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    expect(store.getState().selectedGlass).toEqual(expect.objectContaining({ catalogName: "Schott", glassName: "N-BK7" }));
  });

  it("lets selector selection dismiss the route-intent override", async () => {
    const store = makeStore({
      ...rawData,
      Custom: { "My Glass": rawData.Schott!["N-BK7"] },
    });
    renderWithStore(
      <GlassMapView
        proxy={makeProxy()}
        isReady={true}
        routeIntent={{ source: "medium-selector", catalog: "Schott", glass: "N-BK7" }}
      />,
      store,
    );

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Custom");
    await userEvent.type(screen.getByRole("combobox", { name: "Glass" }), "my glass");
    await userEvent.click(screen.getByRole("button", { name: "Select glass" }));

    expect(await screen.findByRole("heading", { name: "My Glass" })).toBeInTheDocument();
  });

  it("does not enable a disabled catalog when selecting one of its glasses", async () => {
    const store = makeStore();
    act(() => store.getState().toggleCatalog("Schott"));
    renderWithStore(<GlassMapView proxy={makeProxy()} isReady={true} />, store);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Schott");
    await userEvent.type(screen.getByRole("combobox", { name: "Glass" }), "N-BK7");
    await userEvent.click(screen.getByRole("button", { name: "Select glass" }));

    expect(await screen.findByRole("heading", { name: "N-BK7" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Schott" })).not.toBeChecked();
    expect(store.getState().enabledCatalogs.Schott).toBe(false);
    expect(screen.queryAllByTestId("glass-point")).toHaveLength(0);
  });
});
