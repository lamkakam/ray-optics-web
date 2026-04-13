import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, type StoreApi } from "zustand";
import { AnalysisPlotContainer } from "@/features/analysis/components/AnalysisPlotContainer";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import { createAnalysisDataSlice, type AnalysisDataState } from "@/features/analysis/stores/analysisDataStore";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { DiffractionPsfData, GeoPsfData, OpdFanData, OpticalModel, OpticalSpecs, RayFanData, SeidelData, SpotDiagramData, WavefrontMapData } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";
import { AnalysisDataStoreContext } from "@/features/analysis/providers/AnalysisDataStoreProvider";
import { AnalysisPlotStoreContext } from "../../providers/AnalysisPlotStoreProvider";

jest.mock("@/shared/components/providers/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}));

jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: jest.fn(() => ({
    setOption: jest.fn(),
    dispose: jest.fn(),
    resize: jest.fn(),
  })),
}), { virtual: true });

jest.mock("echarts/charts", () => ({
  ScatterChart: {},
  LineChart: {},
  BarChart: {},
}), { virtual: true });

jest.mock("echarts/components", () => ({
  GridComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  TooltipComponent: {},
  VisualMapComponent: {},
}), { virtual: true });

jest.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}), { virtual: true });

// Mock useScreenBreakpoint (AnalysisPlotView uses it)
jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => "screenSM",
}));

const testSpecs: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
  wavelengths: { weights: [[486.1, 1], [587.6, 2], [656.3, 1]], referenceIndex: 1 },
};

const testSpecsHeight: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: { space: "object", type: "height", maxField: 10, fields: [0, 0.5, 1], isRelative: true },
  wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
};

const testModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: testSpecs,
};

const diffractionPsfData: DiffractionPsfData = {
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
};

const wavefrontMapData: WavefrontMapData = {
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
};

const geoPsfData: GeoPsfData = {
  fieldIdx: 0,
  wvlIdx: 0,
  x: [-0.02, 0, 0.02],
  y: [-0.01, 0, 0.01],
  unitX: "mm",
  unitY: "mm",
};

const spotDiagramData: SpotDiagramData = [
  {
    fieldIdx: 0,
    wvlIdx: 0,
    x: [-0.02, 0, 0.02],
    y: [-0.01, 0, 0.01],
    unitX: "mm",
    unitY: "mm",
  },
  {
    fieldIdx: 0,
    wvlIdx: 1,
    x: [-0.03, 0, 0.03],
    y: [-0.015, 0, 0.015],
    unitX: "mm",
    unitY: "mm",
  },
];

const opdFanData: OpdFanData = [
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
    unitY: "waves",
  },
  {
    fieldIdx: 0,
    wvlIdx: 1,
    Sagittal: {
      x: [-1, 0, 1],
      y: [-0.3, 0, 0.3],
    },
    Tangential: {
      x: [-1, 0, 1],
      y: [-0.15, 0, 0.15],
    },
    unitX: "",
    unitY: "waves",
  },
];

const rayFanData: RayFanData = [
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
  {
    fieldIdx: 0,
    wvlIdx: 1,
    Sagittal: {
      x: [-1, 0, 1],
      y: [-0.3, 0, 0.3],
    },
    Tangential: {
      x: [-1, 0, 1],
      y: [-0.15, 0, 0.15],
    },
    unitX: "",
    unitY: "mm",
  },
];

const seidelData: SeidelData = {
  surfaceBySurface: {
    aberrTypes: ["S-I", "S-II", "S-III", "S-IV", "S-V"],
    surfaceLabels: ["S1", "S2", "sum"],
    data: [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.9],
      [0.6, 0.7, 1.3],
      [0.8, 0.9, 1.7],
      [1.0, 1.1, 2.1],
    ],
  },
  transverse: { TSA: 0.1, TCO: 0.2, TAS: 0.3, SAS: 0.4, PTB: 0.5, DST: 0.6 },
  wavefront: { W040: 0.1, W131: 0.2, W222: 0.3, W220: 0.4, W311: 0.5 },
  curvature: { TCV: 0.1, SCV: 0.2, PCV: 0.3 },
};

function makeMockProxy(overrides: Partial<PyodideWorkerAPI> = {}): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    plotRayFan: jest.fn<Promise<string>, [OpticalModel, number]>().mockResolvedValue("base64-rayfan"),
    getRayFanData: jest.fn<Promise<RayFanData>, [OpticalModel, number]>().mockResolvedValue(rayFanData),
    plotOpdFan: jest.fn<Promise<string>, [OpticalModel, number]>().mockResolvedValue("base64-opdfan"),
    getOpdFanData: jest.fn<Promise<OpdFanData>, [OpticalModel, number]>().mockResolvedValue(opdFanData),
    plotSpotDiagram: jest.fn<Promise<string>, [OpticalModel, number]>().mockResolvedValue("base64-spot"),
    getSpotDiagramData: jest.fn<Promise<SpotDiagramData>, [OpticalModel, number]>().mockResolvedValue(spotDiagramData),
    plotSurfaceBySurface3rdOrderAberr: jest.fn<Promise<string>, [OpticalModel]>().mockResolvedValue("base64-3rdorder"),
    plotWavefrontMap: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-wavefront"),
    getWavefrontData: jest.fn<Promise<WavefrontMapData>, [OpticalModel, number, number]>().mockResolvedValue(wavefrontMapData),
    getGeoPSFData: jest.fn<Promise<GeoPsfData>, [OpticalModel, number, number]>().mockResolvedValue(geoPsfData),
    plotGeoPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-geopsf"),
    plotDiffractionPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-diffrpsf"),
    getDiffractionPSFData: jest.fn<Promise<DiffractionPsfData>, [OpticalModel, number, number]>().mockResolvedValue(diffractionPsfData),
    get3rdOrderSeidelData: jest.fn(),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    ...overrides,
  } as unknown as PyodideWorkerAPI;
}

function makeSpecsStore(specs: OpticalSpecs): StoreApi<SpecsConfiguratorState> {
  const store = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  store.getState().loadFromSpecs(specs);
  store.getState().setCommittedSpecs(specs);
  return store;
}

function makeLensStore(model: OpticalModel): StoreApi<LensEditorState> {
  const store = createStore<LensEditorState>(createLensEditorSlice);
  store.getState().setCommittedOpticalModel(model);
  return store;
}

function makeAnalysisDataStore(data?: SeidelData): StoreApi<AnalysisDataState> {
  const store = createStore<AnalysisDataState>(createAnalysisDataSlice);
  if (data) {
    store.getState().setSeidelData(data);
  }
  return store;
}

function renderComponent(
  testSpecs: OpticalSpecs,
  testModel: OpticalModel,
  store: StoreApi<AnalysisPlotState>,
  mockProxy?: PyodideWorkerAPI,
  onError = jest.fn(),
  analysisDataStore: StoreApi<AnalysisDataState> = makeAnalysisDataStore(),
) {
  return (
    render(
      <SpecsConfiguratorStoreContext.Provider value={makeSpecsStore(testSpecs)}>
        <LensEditorStoreContext.Provider value={makeLensStore(testModel)}>
          <AnalysisDataStoreContext.Provider value={analysisDataStore}>
            <AnalysisPlotStoreContext.Provider value={store}>
              <AnalysisPlotContainer
                proxy={mockProxy}
                onError={onError}
              />
            </AnalysisPlotStoreContext.Provider>
          </AnalysisDataStoreContext.Provider>
        </LensEditorStoreContext.Provider>
      </SpecsConfiguratorStoreContext.Provider>
    )
  );
}

describe("AnalysisPlotContainer", () => {
  let store: StoreApi<AnalysisPlotState>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore<AnalysisPlotState>(createAnalysisPlotSlice);
  });

  it("renders AnalysisPlotView (smoke test)", () => {
    renderComponent(testSpecs, testModel, store, makeMockProxy());
    expect(screen.getByLabelText("Field")).toBeInTheDocument();
    expect(screen.getByLabelText("Plot type")).toBeInTheDocument();
  });

  it("derives fieldOptions from committedSpecs with angle type", () => {
    renderComponent(testSpecs, testModel, store, makeMockProxy());
    const fieldSelect = screen.getByLabelText("Field") as HTMLSelectElement;
    expect(fieldSelect).toContainHTML("0.00°");
    expect(fieldSelect).toContainHTML("14.0°");
    expect(fieldSelect).toContainHTML("20.0°");
  });

  it("derives fieldOptions from committedSpecs with height type", () => {
    renderComponent(testSpecsHeight, testModel, store, makeMockProxy());
    const fieldSelect = screen.getByLabelText("Field") as HTMLSelectElement;
    expect(fieldSelect).toContainHTML("0.00 mm");
    expect(fieldSelect).toContainHTML("5.00 mm");
    expect(fieldSelect).toContainHTML("10.0 mm");
  });

  it("derives wavelengthOptions from committedSpecs", async () => {
    // Switch to wavefrontMap so wavelength select is visible
    store.getState().setSelectedPlotType("wavefrontMap");
    renderComponent(testSpecs, testModel, store, makeMockProxy());
    const wlSelect = screen.getByLabelText("Wavelength") as HTMLSelectElement;
    expect(wlSelect).toContainHTML("486.1 nm");
    expect(wlSelect).toContainHTML("587.6 nm");
    expect(wlSelect).toContainHTML("656.3 nm");
  });

  it("handleFieldChange: updates selectedFieldIndex in store and calls getRayFanData for ray fan", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");

    expect(store.getState().selectedFieldIndex).toBe(1);
    await waitFor(() => {
      expect(proxy.getRayFanData).toHaveBeenCalledWith(testModel, 1);
    });
    expect(proxy.plotRayFan).not.toHaveBeenCalled();
    expect(store.getState().rayFanData).toEqual(rayFanData);
  });

  it("handleFieldChange: sets plotLoading true then clears it after plot", async () => {
    let resolveProxy!: (value: RayFanData) => void;
    const proxy = makeMockProxy({
      getRayFanData: jest.fn().mockImplementation(
        () => new Promise<RayFanData>((resolve) => { resolveProxy = resolve; })
      ),
    });
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    const selectPromise = userEvent.selectOptions(fieldSelect, "1");

    await waitFor(() => expect(store.getState().plotLoading).toBe(true));
    resolveProxy(rayFanData);
    await selectPromise;
    await waitFor(() => expect(store.getState().plotLoading).toBe(false));
  });

  it("handleFieldChange: no-op for plot call when fieldDependent === false", async () => {
    store.getState().setSelectedPlotType("surfaceBySurface3rdOrder");
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy, jest.fn(), makeAnalysisDataStore(seidelData));
    // field select is disabled for surfaceBySurface3rdOrder — just verify it's disabled
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).toBeDisabled();
    expect(proxy.plotSurfaceBySurface3rdOrderAberr).not.toHaveBeenCalled();
  });

  it("renders the surface by surface chart from analysisDataStore instead of loading a PNG", async () => {
    store.getState().setSelectedPlotType("surfaceBySurface3rdOrder");
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy, jest.fn(), makeAnalysisDataStore(seidelData));

    expect(screen.getByTestId("surface-by-surface-3rd-order-chart")).toBeInTheDocument();
    expect(proxy.plotSurfaceBySurface3rdOrderAberr).not.toHaveBeenCalled();
  });

  it("handleWavelengthChange: updates selectedWavelengthIndex and calls proxy plot fn", async () => {
    store.getState().setSelectedPlotType("wavefrontMap");
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const wlSelect = screen.getByLabelText("Wavelength");
    await userEvent.selectOptions(wlSelect, "2");

    expect(store.getState().selectedWavelengthIndex).toBe(2);
    await waitFor(() => {
      expect(proxy.getWavefrontData).toHaveBeenCalledWith(testModel, 0, 2);
    });
  });

  it("handlePlotTypeChange: updates selectedPlotType and calls correct proxy fn", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "spotDiagram");

    expect(store.getState().selectedPlotType).toBe("spotDiagram");
    await waitFor(() => {
      expect(proxy.getSpotDiagramData).toHaveBeenCalledWith(testModel, 0);
    });
    expect(proxy.plotSpotDiagram).not.toHaveBeenCalled();
    expect(store.getState().spotDiagramData).toEqual(spotDiagramData);
  });

  it("loads opdFan through getOpdFanData and stores chart data instead of a PNG", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "opdFan");

    expect(store.getState().selectedPlotType).toBe("opdFan");
    await waitFor(() => {
      expect(proxy.getOpdFanData).toHaveBeenCalledWith(testModel, 0);
    });
    expect(proxy.plotOpdFan).not.toHaveBeenCalled();
    expect(store.getState().opdFanData).toEqual(opdFanData);
  });

  it("loads geoPSF through getGeoPSFData and stores chart data instead of a PNG", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "geoPSF");

    expect(store.getState().selectedPlotType).toBe("geoPSF");
    await waitFor(() => {
      expect(proxy.getGeoPSFData).toHaveBeenCalledWith(testModel, 0, 0);
    });
    expect(proxy.plotGeoPSF).not.toHaveBeenCalled();
    expect(store.getState().geoPsfData).toEqual(geoPsfData);
  });

  it("handlePlotTypeChange: no-op when proxy is undefined", async () => {
    renderComponent(testSpecs, testModel, store, undefined);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "opdFan");

    // selectedPlotType is updated in store even without proxy
    expect(store.getState().selectedPlotType).toBe("opdFan");
    // But plotLoading is never set (no async work)
    expect(store.getState().plotLoading).toBe(false);
  });

  it("handlePlotTypeChange: diffractionPSF fetches data and stores it instead of a PNG", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "diffractionPSF");

    expect(store.getState().selectedPlotType).toBe("diffractionPSF");
    await waitFor(() => {
      expect(proxy.getDiffractionPSFData).toHaveBeenCalledWith(testModel, 0, 0);
    });
    expect(store.getState().diffractionPsfData).toEqual(diffractionPsfData);
  });

  it("handlePlotTypeChange: wavefrontMap fetches data and stores it instead of a PNG", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "wavefrontMap");

    expect(store.getState().selectedPlotType).toBe("wavefrontMap");
    await waitFor(() => {
      expect(proxy.getWavefrontData).toHaveBeenCalledWith(testModel, 0, 0);
    });
    expect(store.getState().wavefrontMapData).toEqual(wavefrontMapData);
  });

  it("onError called when proxy throws on field change", async () => {
    const onError = jest.fn();
    const proxy = makeMockProxy({
      getRayFanData: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy, onError);
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("onError called when proxy throws on wavelength change", async () => {
    store.getState().setSelectedPlotType("wavefrontMap");
    const onError = jest.fn();
    const proxy = makeMockProxy({
      getWavefrontData: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy, onError);
    const wlSelect = screen.getByLabelText("Wavelength");
    await userEvent.selectOptions(wlSelect, "2");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("onError called when proxy throws on plot type change", async () => {
    const onError = jest.fn();
    const proxy = makeMockProxy({
      getSpotDiagramData: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy, onError);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "spotDiagram");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("onError called when getOpdFanData throws on plot type change", async () => {
    const onError = jest.fn();
    const proxy = makeMockProxy({
      getOpdFanData: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy, onError);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "opdFan");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("plotLoading cleared in finally even on error", async () => {
    const proxy = makeMockProxy({
      getRayFanData: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");
    await waitFor(() => expect(store.getState().plotLoading).toBe(false));
  });

  it("loads rayFan through getRayFanData and stores chart data instead of a PNG", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");

    await waitFor(() => {
      expect(proxy.getRayFanData).toHaveBeenCalledWith(testModel, 1);
    });
    expect(proxy.plotRayFan).not.toHaveBeenCalled();
    expect(store.getState().rayFanData).toEqual(rayFanData);
  });
});
