/** Exercises shared modal/tool navigation, atomic Apply, cancellation, and history restoration. */
import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import { useAppShellNavigation } from "@/app/hooks/useAppShellNavigation";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { createLensEditorSlice } from "@/features/lens-editor/stores/lensEditorStore";
import { createSpecsConfiguratorSlice } from "@/features/lens-editor/stores/specsConfiguratorStore";
import { createOptimizationSlice } from "@/features/optimization/stores/optimizationStore";

const mockRouter = { push: jest.fn<void, [string]>() };
let mockPathname = "/optimization";
let mockLensStore = createStore(createLensEditorSlice);
let mockSpecsStore = createStore(createSpecsConfiguratorSlice);
let mockOptimizationStore = createStore(createOptimizationSlice);

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));
jest.mock("@/features/lens-editor/providers/LensEditorStoreProvider", () => ({
  useLensEditorStore: () => mockLensStore,
}));
jest.mock(
  "@/features/lens-editor/providers/SpecsConfiguratorStoreProvider",
  () => ({
    useSpecsConfiguratorStore: () => mockSpecsStore,
  }),
);
jest.mock(
  "@/features/optimization/providers/OptimizationStoreProvider",
  () => ({
    useOptimizationStore: () => mockOptimizationStore,
  }),
);

const model: OpticalModel = {
  setAutoAperture: "autoAperture",
  object: { distance: 1e10, medium: "air", manufacturer: "" },
  image: { curvatureRadius: 0 },
  surfaces: [
    {
      label: "Default",
      curvatureRadius: 42,
      thickness: 2,
      medium: "air",
      manufacturer: "",
      semiDiameter: 5,
    },
  ],
  specs: {
    pupil: { space: "object", type: "epd", value: 10 },
    field: {
      space: "object",
      type: "angle",
      fields: [0, 1],
      isRelative: true,
      maxField: 10,
    },
    wavelengths: { weights: [[587.6, 1]], referenceIndex: 0 },
  },
};
const getSurfaceSemiDiameters = jest.fn<Promise<number[]>, [OpticalModel]>();
const proxy = { getSurfaceSemiDiameters } as unknown as PyodideWorkerAPI;
const openErrorModal = jest.fn();
const registerTool = jest.fn().mockResolvedValue(undefined);

/** Retrieves the latest registered descriptor, as the browser does at execution time. */
function tool(name: string): WebMCP.ModelContextTool {
  return registerTool.mock.calls
    .filter(([entry]) => entry.name === name)
    .at(-1)![0];
}

/** Runs a tool with the browser's cancellation contract. */
function execute(
  name: string,
  input: Record<string, unknown>,
  signal = new AbortController().signal,
) {
  return tool(name).execute(input, { signal });
}

describe("useAppShellNavigation", () => {
  beforeEach(() => {
    mockRouter.push.mockReset();
    openErrorModal.mockReset();
    registerTool.mockClear();
    getSurfaceSemiDiameters.mockReset().mockResolvedValue([100, 6, 200]);
    mockPathname = "/optimization";
    mockLensStore = createStore(createLensEditorSlice);
    mockSpecsStore = createStore(createSpecsConfiguratorSlice);
    mockOptimizationStore = createStore(createOptimizationSlice);
    mockOptimizationStore.setState({
      optimizationModel: model,
      hasUnappliedOptimizationResult: true,
    });
    window.history.replaceState({}, "", "/optimization");
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: undefined,
    });
    window.history.replaceState({}, "", "/");
  });

  it("navigates directly when there is no unapplied result", () => {
    mockOptimizationStore.setState({ hasUnappliedOptimizationResult: false });
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    let navigated: boolean | undefined;
    act(() => {
      navigated = result.current.guardedNavigate("/about");
    });
    expect(navigated).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledWith("/about");
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
  });

  it("shares pending destinations between navigation, WebMCP Stay, and modal Leave", async () => {
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    act(() => {
      result.current.guardedNavigate("/about");
    });
    expect(result.current.confirmationModalProps.isOpen).toBe(true);
    expect(JSON.parse(String(await execute("get_active_page", {})))).toEqual({
      page: "optimization",
      pendingNavigation: "about",
    });
    await act(async () => {
      await execute("resolve_optimization_navigation", { action: "stay" });
    });
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
    expect(mockRouter.push).not.toHaveBeenCalled();

    act(() => {
      result.current.guardedNavigate("/settings");
    });
    expect(result.current.confirmationModalProps.isOpen).toBe(true);
    act(() => {
      result.current.confirmationModalProps.onLeave();
    });
    expect(mockRouter.push).toHaveBeenCalledWith("/settings");
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
    expect(
      mockOptimizationStore.getState().hasUnappliedOptimizationResult,
    ).toBe(true);
    expect(getSurfaceSemiDiameters).not.toHaveBeenCalled();
  });

  it("rejects WebMCP page navigation away from a pending Optimization result without deferring it", async () => {
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );

    const error = await Promise.resolve(
      execute("set_active_page", { page: "settings" }),
    ).catch((rejection: unknown) => rejection);
    expect(JSON.parse((error as Error).message)).toEqual({
      error: {
        tool: "set_active_page",
        code: "precondition_failed",
        message:
          "Cannot leave the Optimization page while an optimized lens prescription is pending. Call apply_optimization_to_editor to apply it to the Lens Editor, or call discard_optimization_result to discard it, then call set_active_page again.",
      },
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
    expect(JSON.parse(String(await execute("get_active_page", {})))).toEqual({
      page: "optimization",
    });
  });

  it("navigates through WebMCP as soon as the pending Optimization result is cleared", async () => {
    renderHook(() => useAppShellNavigation(proxy, openErrorModal));
    mockOptimizationStore.setState({ hasUnappliedOptimizationResult: false });

    expect(
      JSON.parse(String(await execute("set_active_page", { page: "about" }))),
    ).toEqual({ status: "navigated", page: "about" });
    expect(mockRouter.push).toHaveBeenCalledWith("/about");
  });

  it("waits for atomic editor synchronization before marking applied and navigating", async () => {
    let finish!: (values: number[]) => void;
    getSurfaceSemiDiameters.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const initialLens = mockLensStore.getState();
    const initialSpecs = mockSpecsStore.getState();
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    act(() => {
      result.current.guardedNavigate("/about");
    });
    act(() => {
      result.current.confirmationModalProps.onApplyToEditor();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockLensStore.getState()).toBe(initialLens);
    expect(mockSpecsStore.getState()).toBe(initialSpecs);
    expect(
      mockOptimizationStore.getState().hasUnappliedOptimizationResult,
    ).toBe(true);

    await act(async () => {
      finish([100, 6, 200]);
    });
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/about"));
    expect(mockLensStore.getState()).not.toBe(initialLens);
    expect(mockSpecsStore.getState()).not.toBe(initialSpecs);
    expect(
      mockOptimizationStore.getState().hasUnappliedOptimizationResult,
    ).toBe(false);
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
    expect(openErrorModal).not.toHaveBeenCalled();
  });

  it("keeps the result and destination pending and reports a failed Apply", async () => {
    getSurfaceSemiDiameters.mockRejectedValue(new Error("Aperture failed"));
    const initialLens = mockLensStore.getState();
    const initialSpecs = mockSpecsStore.getState();
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    act(() => {
      result.current.guardedNavigate("/about");
    });
    act(() => {
      result.current.confirmationModalProps.onApplyToEditor();
    });
    await waitFor(() => expect(openErrorModal).toHaveBeenCalledTimes(1));
    expect(mockLensStore.getState()).toBe(initialLens);
    expect(mockSpecsStore.getState()).toBe(initialSpecs);
    expect(
      mockOptimizationStore.getState().hasUnappliedOptimizationResult,
    ).toBe(true);
    expect(result.current.confirmationModalProps.isOpen).toBe(true);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it.each(["before", "during"] as const)(
    "preserves state when WebMCP Apply is cancelled %s synchronization",
    async (timing) => {
      let finish!: (values: number[]) => void;
      getSurfaceSemiDiameters.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      const initialLens = mockLensStore.getState();
      const initialSpecs = mockSpecsStore.getState();
      const { result } = renderHook(() =>
        useAppShellNavigation(proxy, openErrorModal),
      );
      act(() => {
        result.current.guardedNavigate("/settings");
      });
      const controller = new AbortController();
      if (timing === "before") controller.abort();
      let application!: Promise<unknown>;
      await act(async () => {
        application = Promise.resolve(
          execute(
            "resolve_optimization_navigation",
            { action: "apply_to_editor" },
            controller.signal,
          ),
        );
        void application.catch(() => undefined);
      });
      if (timing === "during") {
        expect(getSurfaceSemiDiameters).toHaveBeenCalledWith(model);
        controller.abort();
        await act(async () => {
          finish([100, 6, 200]);
          await application.catch(() => undefined);
        });
      }
      await expect(application).rejects.toMatchObject({ name: "AbortError" });
      expect(mockLensStore.getState()).toBe(initialLens);
      expect(mockSpecsStore.getState()).toBe(initialSpecs);
      expect(
        mockOptimizationStore.getState().hasUnappliedOptimizationResult,
      ).toBe(true);
      expect(result.current.confirmationModalProps.isOpen).toBe(true);
      expect(JSON.parse(String(await execute("get_active_page", {})))).toEqual({
        page: "optimization",
        pendingNavigation: "settings",
      });
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(openErrorModal).not.toHaveBeenCalled();
    },
  );

  it("rejects WebMCP Apply and keeps the destination pending when Pyodide is not ready", async () => {
    const { result } = renderHook(() =>
      useAppShellNavigation(undefined, openErrorModal),
    );
    act(() => {
      result.current.guardedNavigate("/settings");
    });

    const error = await Promise.resolve(
      execute("resolve_optimization_navigation", { action: "apply_to_editor" }),
    ).catch((rejection: unknown) => rejection);

    const payload = JSON.parse((error as Error).message);
    expect(payload.error).toMatchObject({
      tool: "resolve_optimization_navigation",
      code: "not_ready",
      message:
        "Pyodide is not ready, so the optimized lens prescription cannot be applied yet.",
    });
    expect(payload.error.hint).toContain("stay");
    expect(payload.error.hint).toContain("leave");
    expect(result.current.confirmationModalProps.isOpen).toBe(true);
    expect(JSON.parse(String(await execute("get_active_page", {})))).toEqual({
      page: "optimization",
      pendingNavigation: "settings",
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("rejects WebMCP Apply without a model and reports the cancelled navigation", async () => {
    mockOptimizationStore.setState({ optimizationModel: undefined });
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    act(() => {
      result.current.guardedNavigate("/settings");
    });

    const error = await act(() =>
      Promise.resolve(
        execute("resolve_optimization_navigation", {
          action: "apply_to_editor",
        }),
      ).catch((rejection: unknown) => rejection),
    );

    expect(JSON.parse((error as Error).message)).toEqual({
      error: {
        tool: "resolve_optimization_navigation",
        code: "precondition_failed",
        message:
          "No optimized lens prescription is available to apply, so the pending navigation was cancelled and the page stayed on Optimization.",
        hint: "Call set_active_page to navigate again.",
      },
    });
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("restores the full Optimization history entry before offering the attempted destination", () => {
    const activeState = { __NA: true, tree: ["optimization"], key: "active" };
    const activeHref = "/optimization?run=2#result";
    const destination = "/glass-map?glass=N-BK7#details";
    window.history.replaceState(activeState, "", activeHref);
    const { result } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    const downstreamListener = jest.fn();
    window.addEventListener("popstate", downstreamListener);
    try {
      window.history.replaceState(
        { __NA: true, key: "target" },
        "",
        destination,
      );
      fireEvent(
        window,
        new PopStateEvent("popstate", { state: window.history.state }),
      );
      expect(
        window.location.pathname +
          window.location.search +
          window.location.hash,
      ).toBe(activeHref);
      expect(window.history.state).toEqual(activeState);
      expect(downstreamListener).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(result.current.confirmationModalProps.isOpen).toBe(true);
      act(() => {
        result.current.confirmationModalProps.onLeave();
      });
      expect(mockRouter.push).toHaveBeenCalledWith(destination);
    } finally {
      window.removeEventListener("popstate", downstreamListener);
    }
  });

  it("leaves unguarded history destinations intact and removes unload protection on unmount", () => {
    mockPathname = "/";
    window.history.replaceState({}, "", "/");
    const { result, unmount } = renderHook(() =>
      useAppShellNavigation(proxy, openErrorModal),
    );
    const beforeUnload = new Event("beforeunload", { cancelable: true });
    fireEvent(window, beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
    window.history.replaceState(
      { key: "about" },
      "",
      "/about?topic=help#details",
    );
    fireEvent(
      window,
      new PopStateEvent("popstate", { state: window.history.state }),
    );
    expect(
      window.location.pathname + window.location.search + window.location.hash,
    ).toBe("/about?topic=help#details");
    expect(window.history.state).toEqual({ key: "about" });
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(result.current.confirmationModalProps.isOpen).toBe(false);
    unmount();
    const afterUnmount = new Event("beforeunload", { cancelable: true });
    fireEvent(window, afterUnmount);
    expect(afterUnmount.defaultPrevented).toBe(false);
  });
});
