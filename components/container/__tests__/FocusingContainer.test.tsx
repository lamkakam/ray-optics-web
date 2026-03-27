import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createStore } from "zustand";
import { FocusingContainer } from "@/components/container/FocusingContainer";
import { createLensEditorSlice, type LensEditorState } from "@/store/lensEditorStore";
import { createSpecsConfigurerSlice, type SpecsConfigurerState } from "@/store/specsConfigurerStore";
import { surfacesToGridRows } from "@/lib/gridTransform";
import type { OpticalModel } from "@/lib/opticalModel";
import type { PyodideWorkerAPI } from "@/hooks/usePyodide";

const testSurfaces = {
  object: { distance: 1e10 },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default" as const,
      curvatureRadius: 23.713,
      thickness: 4.831,
      medium: "N-LAK9",
      manufacturer: "Schott",
      semiDiameter: 10,
    },
    {
      label: "Default" as const,
      curvatureRadius: -20.4942,
      thickness: 41.2365,
      medium: "air",
      manufacturer: "",
      semiDiameter: 8,
    },
  ],
};

function createTestSpecsStore() {
  const store = createStore<SpecsConfigurerState>(createSpecsConfigurerSlice);
  store.getState().setField({
    space: "object",
    type: "angle",
    maxField: 20,
    relativeFields: [0, 0.7, 1],
  });
  return store;
}

function createTestLensStore() {
  const store = createStore<LensEditorState>(createLensEditorSlice);
  store.getState().setRows(surfacesToGridRows(testSurfaces));
  return store;
}

const testOpticalModel: OpticalModel = {
  setAutoAperture: "manualAperture",
  ...testSurfaces,
  specs: {
    pupil: { space: "object", type: "epd", value: 25 },
    field: { space: "object", type: "angle", maxField: 20, fields: [0, 0.7, 1], isRelative: true },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};

const focusingResult = { delta_thi: 0.5, metric_value: 0.01 };

function makeMockProxy(overrides: Partial<PyodideWorkerAPI> = {}): PyodideWorkerAPI {
  return {
    init: jest.fn(),
    getFirstOrderData: jest.fn(),
    plotLensLayout: jest.fn(),
    plotRayFan: jest.fn(),
    plotOpdFan: jest.fn(),
    plotSpotDiagram: jest.fn(),
    plotSurfaceBySurface3rdOrderAberr: jest.fn(),
    get3rdOrderSeidelData: jest.fn(),
    getZernikeCoefficients: jest.fn(),
    focusByMonoRmsSpot: jest.fn().mockResolvedValue(focusingResult),
    focusByMonoStrehl: jest.fn().mockResolvedValue(focusingResult),
    focusByPolyRmsSpot: jest.fn().mockResolvedValue(focusingResult),
    focusByPolyStrehl: jest.fn().mockResolvedValue(focusingResult),
    ...overrides,
  } as unknown as PyodideWorkerAPI;
}

describe("FocusingContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders FocusingPanel (smoke test)", () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={makeMockProxy()}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={jest.fn().mockResolvedValue(undefined)}
        onError={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Focus" })).toBeInTheDocument();
  });

  it("Focus button is disabled when isReady=false", () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={undefined}
        isReady={false}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={jest.fn().mockResolvedValue(undefined)}
        onError={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Focus" })).toBeDisabled();
  });

  it("Focus button is disabled when computing=true", () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={makeMockProxy()}
        isReady={true}
        computing={true}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={jest.fn().mockResolvedValue(undefined)}
        onError={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Focus" })).toBeDisabled();
  });

  it("calls focusByMonoRmsSpot by default (mono + rmsSpot)", async () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    const proxy = makeMockProxy();
    const onUpdateSystem = jest.fn().mockResolvedValue(undefined);
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={proxy}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={onUpdateSystem}
        onError={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Focus" }));
    await waitFor(() => expect(proxy.focusByMonoRmsSpot).toHaveBeenCalledWith(testOpticalModel, 0));
  });

  it("calls onUpdateSystem after updating the store", async () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    const proxy = makeMockProxy();
    const onUpdateSystem = jest.fn().mockResolvedValue(undefined);
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={proxy}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={onUpdateSystem}
        onError={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Focus" }));
    await waitFor(() => expect(onUpdateSystem).toHaveBeenCalledTimes(1));
  });

  it("updates last surface thickness by delta_thi after focusing", async () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    const proxy = makeMockProxy();
    const onUpdateSystem = jest.fn().mockResolvedValue(undefined);
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={proxy}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={onUpdateSystem}
        onError={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Focus" }));
    await waitFor(() => expect(onUpdateSystem).toHaveBeenCalled());

    // Last surface was thickness=41.2365, delta_thi=0.5 → 41.7365
    const rows = lensStore.getState().rows;
    const lastSurface = [...rows].reverse().find((r) => r.kind === "surface");
    expect(lastSurface).toBeDefined();
    if (lastSurface && lastSurface.kind === "surface") {
      expect(lastSurface.thickness).toBeCloseTo(41.7365, 4);
    }
  });

  it("calls onError when proxy throws", async () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    const onError = jest.fn();
    const proxy = makeMockProxy({
      focusByMonoRmsSpot: jest.fn().mockRejectedValue(new Error("fail")),
    });
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={proxy}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={jest.fn().mockResolvedValue(undefined)}
        onError={onError}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Focus" }));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("shows LoadingOverlay while focusing", async () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    let resolveProxy!: () => void;
    const slowProxy = makeMockProxy({
      focusByMonoRmsSpot: jest.fn().mockImplementation(
        () => new Promise<typeof focusingResult>((resolve) => {
          resolveProxy = () => resolve(focusingResult);
        })
      ),
    });
    const onUpdateSystem = jest.fn().mockResolvedValue(undefined);
    render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={slowProxy}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={onUpdateSystem}
        onError={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByText("Focusing…")).toBeInTheDocument();
    resolveProxy();
    await waitFor(() => expect(screen.queryByText("Focusing…")).not.toBeInTheDocument());
  });

  it("field dropdown options sync with specsStore even before commit", async () => {
    const lensStore = createTestLensStore();
    const specsStore = createTestSpecsStore();
    const { rerender } = render(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={makeMockProxy()}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={jest.fn().mockResolvedValue(undefined)}
        onError={jest.fn()}
      />
    );

    // Initial: maxField=20, fields=[0, 0.7, 1] → options "0.00°", "14.0°", "20.0°"
    expect(screen.getByRole("option", { name: "0.00°" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "14.0°" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "20.0°" })).toBeInTheDocument();

    // Update specsStore without committing
    act(() => {
      specsStore.getState().setField({
        space: "object",
        type: "angle",
        maxField: 30,
        relativeFields: [0, 1],
      });
    });

    // Force re-render to pick up store changes
    rerender(
      <FocusingContainer
        lensStore={lensStore}
        specsStore={specsStore}
        proxy={makeMockProxy()}
        isReady={true}
        computing={false}
        getOpticalModel={() => testOpticalModel}
        onUpdateSystem={jest.fn().mockResolvedValue(undefined)}
        onError={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "0.00°" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "30.0°" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "14.0°" })).not.toBeInTheDocument();
    });
  });
});
