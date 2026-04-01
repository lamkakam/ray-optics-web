import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, type StoreApi } from "zustand";
import { AnalysisPlotContainer } from "@/features/analysis/components/AnalysisPlotContainer";
import { createAnalysisPlotSlice, type AnalysisPlotState } from "@/features/analysis/stores/analysisPlotStore";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import type { OpticalModel, OpticalSpecs } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { SpecsConfiguratorStoreContext } from "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";

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
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: testSpecs,
};

function makeMockProxy(overrides: Partial<PyodideWorkerAPI> = {}): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    plotRayFan: jest.fn<Promise<string>, [OpticalModel, number]>().mockResolvedValue("base64-rayfan"),
    plotOpdFan: jest.fn<Promise<string>, [OpticalModel, number]>().mockResolvedValue("base64-opdfan"),
    plotSpotDiagram: jest.fn<Promise<string>, [OpticalModel, number]>().mockResolvedValue("base64-spot"),
    plotSurfaceBySurface3rdOrderAberr: jest.fn<Promise<string>, [OpticalModel]>().mockResolvedValue("base64-3rdorder"),
    plotWavefrontMap: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-wavefront"),
    plotGeoPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-geopsf"),
    plotDiffractionPSF: jest.fn<Promise<string>, [OpticalModel, number, number]>().mockResolvedValue("base64-diffrpsf"),
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

function renderComponent(
  testSpecs: OpticalSpecs,
  testModel: OpticalModel,
  store: StoreApi<AnalysisPlotState>,
  mockProxy?: PyodideWorkerAPI,
  onError = jest.fn(),
) {
  return (
    render(
      <SpecsConfiguratorStoreContext.Provider value={makeSpecsStore(testSpecs)}>
        <LensEditorStoreContext.Provider value={makeLensStore(testModel)}>
          <AnalysisPlotContainer
            store={store}
            proxy={mockProxy}
            onError={onError}
          />
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

  it("handleFieldChange: updates selectedFieldIndex in store and calls proxy plot fn", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");

    expect(store.getState().selectedFieldIndex).toBe(1);
    await waitFor(() => {
      expect(proxy.plotRayFan).toHaveBeenCalledWith(testModel, 1);
    });
  });

  it("handleFieldChange: sets plotLoading true then clears it after plot", async () => {
    let resolveProxy!: (v: string) => void;
    const proxy = makeMockProxy({
      plotRayFan: jest.fn().mockImplementation(
        () => new Promise<string>((resolve) => { resolveProxy = resolve; })
      ),
    });
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    void userEvent.selectOptions(fieldSelect, "1");

    await waitFor(() => expect(store.getState().plotLoading).toBe(true));
    resolveProxy("base64");
    await waitFor(() => expect(store.getState().plotLoading).toBe(false));
  });

  it("handleFieldChange: no-op for plot call when fieldDependent === false", async () => {
    store.getState().setSelectedPlotType("surfaceBySurface3rdOrder");
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    // field select is disabled for surfaceBySurface3rdOrder — just verify it's disabled
    const fieldSelect = screen.getByLabelText("Field");
    expect(fieldSelect).toBeDisabled();
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
      expect(proxy.plotWavefrontMap).toHaveBeenCalledWith(testModel, 0, 2);
    });
  });

  it("handlePlotTypeChange: updates selectedPlotType and calls correct proxy fn", async () => {
    const proxy = makeMockProxy();
    renderComponent(testSpecs, testModel, store, proxy);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "spotDiagram");

    expect(store.getState().selectedPlotType).toBe("spotDiagram");
    await waitFor(() => {
      expect(proxy.plotSpotDiagram).toHaveBeenCalledWith(testModel, 0);
    });
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

  it("onError called when proxy throws on field change", async () => {
    const onError = jest.fn();
    const proxy = makeMockProxy({
      plotRayFan: jest.fn().mockRejectedValue(new Error("fail")),
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
      plotWavefrontMap: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy, onError);
    const wlSelect = screen.getByLabelText("Wavelength");
    await userEvent.selectOptions(wlSelect, "2");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("onError called when proxy throws on plot type change", async () => {
    const onError = jest.fn();
    const proxy = makeMockProxy({
      plotSpotDiagram: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy, onError);
    const plotTypeSelect = screen.getByLabelText("Plot type");
    await userEvent.selectOptions(plotTypeSelect, "spotDiagram");
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("plotLoading cleared in finally even on error", async () => {
    const proxy = makeMockProxy({
      plotRayFan: jest.fn().mockRejectedValue(new Error("fail")),
    });
    renderComponent(testSpecs, testModel, store, proxy);
    const fieldSelect = screen.getByLabelText("Field");
    await userEvent.selectOptions(fieldSelect, "1");
    await waitFor(() => expect(store.getState().plotLoading).toBe(false));
  });
});
