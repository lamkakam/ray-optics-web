import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore, type StoreApi } from "zustand";
import { BottomDrawerContainer } from "@/features/lens-editor/components/BottomDrawerContainer";
import { createLensEditorSlice, type LensEditorState } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice, type SpecsConfiguratorState } from "@/features/lens-editor/stores/specsConfiguratorStore";
import type { OpticalModel, OpticalSpecs } from "@/shared/lib/types/opticalModel";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { LensEditorStoreContext } from "@/features/lens-editor/providers/LensEditorStoreProvider";

// Mock child containers to avoid complex deps
jest.mock("@/features/lens-editor/components/SpecsConfiguratorContainer", () => ({
  SpecsConfiguratorContainer: () => <div data-testid="specs-content">Specs Content</div>,
}));

jest.mock("@/features/lens-editor/components/LensPrescriptionContainer", () => ({
  LensPrescriptionContainer: () => <div data-testid="prescription-content">Prescription Content</div>,
}));

jest.mock("@/features/lens-editor/components/FocusingContainer", () => ({
  FocusingContainer: () => <div data-testid="focusing-content">Focusing Content</div>,
}));

// Mock useScreenBreakpoint (used inside BottomDrawer -> Tabs)
jest.mock("@/shared/hooks/useScreenBreakpoint", () => ({
  useScreenBreakpoint: () => "screenLG",
}));

const testSpecs: OpticalSpecs = {
  pupil: { space: "object", type: "epd", value: 25 },
  field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
  wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
};

const testModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [],
  specs: testSpecs,
};

function makeStores() {
  const specsStore = createStore<SpecsConfiguratorState>(createSpecsConfiguratorSlice);
  const lensStore = createStore<LensEditorState>(createLensEditorSlice);
  return { specsStore, lensStore };
}

function makeProxy(): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    plotRayFan: jest.fn(),
    getRayFanData: jest.fn(),
    plotOpdFan: jest.fn(),
    getOpdFanData: jest.fn(),
    plotSpotDiagram: jest.fn(),
    plotSurfaceBySurface3rdOrderAberr: jest.fn(),
    plotWavefrontMap: jest.fn(),
    getWavefrontData: jest.fn(),
    getGeoPSFData: jest.fn(),
    plotGeoPSF: jest.fn(),
    plotDiffractionPSF: jest.fn(),
    getDiffractionPSFData: jest.fn(),
    get3rdOrderSeidelData: jest.fn(),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn(),
    focusByMonoStrehl: jest.fn(),
    focusByPolyRmsSpot: jest.fn(),
    focusByPolyStrehl: jest.fn(),
    getAllGlassCatalogsData: jest.fn(),
  } as unknown as PyodideWorkerAPI;
}

function renderContainer(draggable: boolean, lensStore?: StoreApi<LensEditorState>) {
  const stores = makeStores();
  const resolvedLensStore = lensStore ?? stores.lensStore;
  return render(
    <LensEditorStoreContext.Provider value={resolvedLensStore}>
      <BottomDrawerContainer
        getOpticalModel={() => testModel}
        onImportJson={jest.fn()}
        onUpdateSystem={jest.fn()}
        isReady={true}
        computing={false}
        proxy={makeProxy()}
        onError={jest.fn()}
        draggable={draggable}
      />
    </LensEditorStoreContext.Provider>
  );
}

describe("BottomDrawerContainer", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 1000,
    });
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      writable: true,
      value: MouseEvent,
    });
  });

  it("renders all three drawer tab labels", () => {
    renderContainer(true);
    expect(screen.getByRole("tab", { name: "System Specs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Prescription" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Focusing" })).toBeInTheDocument();
  });

  it("with draggable=true: drag handle is present", () => {
    renderContainer(true);
    expect(screen.getByRole("separator", { name: "Resize drawer" })).toBeInTheDocument();
  });

  it("with draggable=false: drag handle is absent", () => {
    renderContainer(false);
    expect(screen.queryByRole("separator", { name: "Resize drawer" })).not.toBeInTheDocument();
  });

  it("tab switching works: click Prescription shows prescription content", async () => {
    renderContainer(true);
    const tab = screen.getByRole("tab", { name: "Prescription" });
    await userEvent.click(tab);
    expect(screen.getByTestId("prescription-content")).toBeInTheDocument();
  });

  it("stores the active tab id in the lens editor slice when tabs change", async () => {
    const lensStore = createStore<LensEditorState>(createLensEditorSlice);
    renderContainer(true, lensStore);

    await userEvent.click(screen.getByRole("tab", { name: "Focusing" }));

    expect(lensStore.getState().activeBottomDrawerTabId).toBe("focusing");
  });

  it("restores the previously active tab after remounting with the same lens store", async () => {
    const lensStore = createStore<LensEditorState>(createLensEditorSlice);
    const user = userEvent.setup();
    const initialRender = renderContainer(true, lensStore);

    await user.click(screen.getByRole("tab", { name: "Prescription" }));
    expect(screen.getByTestId("prescription-content")).toBeInTheDocument();

    initialRender.unmount();
    renderContainer(true, lensStore);

    expect(screen.getByTestId("prescription-content")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Prescription" })).toHaveAttribute("aria-selected", "true");
  });

  it("stores the committed drawer height in the lens editor slice", async () => {
    const lensStore = createStore<LensEditorState>(createLensEditorSlice);
    renderContainer(true, lensStore);

    const handle = screen.getByRole("separator", { name: "Resize drawer" });
    Object.defineProperty(handle, "setPointerCapture", {
      configurable: true,
      value: jest.fn(),
    });

    await waitFor(() => {
      const drawer = handle.parentElement;
      expect(drawer).not.toBeNull();
      expect(drawer).toHaveStyle({ height: "400px" });
    });

    fireEvent.pointerDown(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 500, pointerId: 1 });

    expect(lensStore.getState().bottomDrawerHeight).toBeUndefined();

    fireEvent.pointerUp(handle, { pointerId: 1 });

    expect(lensStore.getState().bottomDrawerHeight).toBe(600);
  });

  it("restores the previously committed drawer height after remounting with the same lens store", async () => {
    const lensStore = createStore<LensEditorState>(createLensEditorSlice);
    lensStore.getState().setBottomDrawerHeight(560);

    const initialRender = renderContainer(true, lensStore);

    await waitFor(() => {
      const handle = screen.getByRole("separator", { name: "Resize drawer" });
      const drawer = handle.parentElement;
      expect(drawer).not.toBeNull();
      expect(drawer).toHaveStyle({ height: "560px" });
    });

    initialRender.unmount();
    renderContainer(true, lensStore);

    const remountedHandle = screen.getByRole("separator", { name: "Resize drawer" });
    const remountedDrawer = remountedHandle.parentElement;
    expect(remountedDrawer).not.toBeNull();
    expect(remountedDrawer).toHaveStyle({ height: "560px" });
  });
});
