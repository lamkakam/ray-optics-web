import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
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
  object: { distance: 1e10 },
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
  } as unknown as PyodideWorkerAPI;
}

function renderContainer(draggable: boolean) {
  const { specsStore, lensStore } = makeStores();
  return render(
    <LensEditorStoreContext.Provider value={lensStore}>
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
});
