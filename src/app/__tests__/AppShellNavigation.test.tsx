/**
 * Exercises the AppShell navigation callback at its public Layout boundary.
 * The boundary mock intentionally invokes the callback both with and without
 * a mouse event so its return value and optional event handling are observable.
 * It also exercises the three global page WebMCP registrations and confirms
 * that they share the shell's Optimization confirmation state machine.
 * Cancelled Apply requests exercise the real helper and leave editor/specs
 * stores, the unapplied result, and the pending destination intact.
 */
import type React from "react";
import { act, render } from "@testing-library/react";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import AppShell from "@/app/AppShell";
import { createStore } from "zustand/vanilla";
import {
  createLensEditorSlice,
  type LensEditorState,
} from "@/features/lens-editor/stores/lensEditorStore";
import {
  createSpecsConfiguratorSlice,
  type SpecsConfiguratorState,
} from "@/features/lens-editor/stores/specsConfiguratorStore";

const mockPush = jest.fn<void, [string]>();
let mockPathname = "/";
let mockHasUnappliedResult = false;
let mockOptimizationModel: OpticalModel | undefined;
let mockCapturedOnNavigate:
  | ((href: string, event?: React.MouseEvent<HTMLAnchorElement>) => boolean)
  | undefined;
let mockUnappliedModalProps:
  | {
      readonly isOpen: boolean;
      readonly onStay: () => void;
      readonly onLeave: () => void;
      readonly onApplyToEditor: () => void | Promise<void>;
    }
  | undefined;

const mockGlassMapStore = {
  getState: () => ({ catalogsData: {}, lookupMaps: undefined }),
};
let mockLensStore = createStore<LensEditorState>(createLensEditorSlice);
let mockSpecsStore = createStore<SpecsConfiguratorState>(
  createSpecsConfiguratorSlice,
);
const mockMarkResultApplied = jest.fn(() => {
  mockHasUnappliedResult = false;
});
const mockOptimizationStore = {
  getState: () => ({
    hasUnappliedOptimizationResult: mockHasUnappliedResult,
    optimizationModel: mockOptimizationModel,
    markOptimizationResultAppliedToEditor: mockMarkResultApplied,
  }),
};
const mockGetSurfaceSemiDiameters = jest.fn();
const mockProxy = {
  getSurfaceSemiDiameters: mockGetSurfaceSemiDiameters,
} as unknown as PyodideWorkerAPI;

function setModelContext(
  modelContext: Pick<WebMCP.ModelContext, "registerTool"> | undefined,
): void {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: modelContext,
  });
}

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("zustand", () => ({
  useStore: <State, Selected>(
    store: { getState: () => State },
    selector: (state: State) => Selected,
  ) => selector(store.getState()),
}));

jest.mock("@/shared/hooks/usePyodide", () => ({
  usePyodide: () => ({
    proxy: mockProxy,
    isReady: false,
    error: undefined,
    initProgress: { value: 0, status: "Loading" },
  }),
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

jest.mock("@/features/glass-map/providers/GlassMapStoreProvider", () => ({
  useGlassMapStore: () => mockGlassMapStore,
}));

const mockApplyOptimizationModelToEditor = jest
  .fn<Promise<void>, [unknown]>()
  .mockResolvedValue(undefined);
jest.mock("@/features/optimization/lib/applyOptimizationModelToEditor", () => ({
  applyOptimizationModelToEditor: (...args: [unknown]) =>
    mockApplyOptimizationModelToEditor(...args),
}));

jest.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({
    children,
    onNavigate,
  }: {
    readonly children: React.ReactNode;
    readonly onNavigate?: typeof mockCapturedOnNavigate;
  }) => {
    mockCapturedOnNavigate = onNavigate;
    return <>{children}</>;
  },
}));

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { readonly children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/shared/components/primitives/ErrorModal", () => ({
  ErrorModal: () => undefined,
}));

jest.mock("@/shared/components/primitives/LoadingOverlay", () => ({
  LoadingOverlay: () => undefined,
}));

jest.mock("@/shared/components/primitives/Progress", () => ({
  Progress: () => undefined,
}));

jest.mock("@/app/UnappliedOptimizationResultModal", () => ({
  UnappliedOptimizationResultModal: (props: typeof mockUnappliedModalProps) => {
    mockUnappliedModalProps = props;
    return undefined;
  },
}));

describe("AppShell navigation callback", () => {
  beforeEach(() => {
    mockPush.mockReset();
    setModelContext(undefined);
    mockPathname = "/";
    mockHasUnappliedResult = false;
    mockOptimizationModel = undefined;
    mockApplyOptimizationModelToEditor.mockReset().mockResolvedValue(undefined);
    mockLensStore = createStore<LensEditorState>(createLensEditorSlice);
    mockSpecsStore = createStore<SpecsConfiguratorState>(
      createSpecsConfiguratorSlice,
    );
    mockGetSurfaceSemiDiameters.mockReset();
    mockMarkResultApplied.mockClear();
    mockCapturedOnNavigate = undefined;
    mockUnappliedModalProps = undefined;
  });

  it("returns true and navigates when called without a mouse event", () => {
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );
    let result: boolean | undefined;

    act(() => {
      result = mockCapturedOnNavigate?.("/about");
    });

    expect(result).toBe(true);
    expect(mockPush).toHaveBeenCalledWith("/about");
  });

  it("prevents a guarded event and returns false without navigating", () => {
    mockPathname = "/optimization";
    mockHasUnappliedResult = true;
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );
    const preventDefault = jest.fn();
    const event = {
      preventDefault,
    } as unknown as React.MouseEvent<HTMLAnchorElement>;
    let result: boolean | undefined;

    act(() => {
      result = mockCapturedOnNavigate?.("/about", event);
    });

    expect(result).toBe(false);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores a leave callback when no navigation is pending", () => {
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );

    act(() => {
      mockUnappliedModalProps?.onLeave();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not apply a model when the apply callback has no pending destination", () => {
    mockOptimizationModel = {} as OpticalModel;
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );

    act(() => {
      mockUnappliedModalProps?.onApplyToEditor();
    });

    expect(mockApplyOptimizationModelToEditor).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([
    ["/", "lens_editor"],
    ["/example-systems", "example_systems"],
    ["/optimization", "optimization"],
    ["/glass-map", "glass_map"],
    ["/import-custom-glass", "import_custom_glass"],
    ["/settings", "settings"],
    ["/privacy-policy", "privacy_policy"],
    ["/about", "about"],
  ] as const)(
    "registers global page tools on the %s route and cleans them up",
    (path, _page) => {
      mockPathname = path;
      const registerTool = jest.fn().mockResolvedValue(undefined);
      setModelContext({ registerTool });

      const { unmount } = render(
        <AppShell>
          <div>Route body</div>
        </AppShell>,
      );

      expect(registerTool).toHaveBeenCalledTimes(3);
      expect(registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
        "set_active_page",
        "get_active_page",
        "resolve_optimization_navigation",
      ]);
      const signals = registerTool.mock.calls.map(
        ([, options]) =>
          (options as WebMCP.ModelContextRegisterToolOptions).signal,
      );
      expect(signals.every((signal) => signal?.aborted === false)).toBe(true);

      unmount();
      expect(signals.every((signal) => signal?.aborted === true)).toBe(true);
    },
  );

  it("shares the Optimization leave guard with WebMCP navigation", async () => {
    mockPathname = "/optimization";
    mockHasUnappliedResult = true;
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );
    const setActivePage = registerTool.mock.calls.find(
      ([tool]) => tool.name === "set_active_page",
    )?.[0] as WebMCP.ModelContextTool;

    let result: unknown;
    await act(async () => {
      result = await setActivePage.execute(
        { page: "about" },
        { signal: new AbortController().signal },
      );
    });

    expect(JSON.parse(String(result))).toEqual({
      status: "pending_optimization_confirmation",
      currentPage: "optimization",
      requestedPage: "about",
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockUnappliedModalProps?.isOpen).toBe(true);
  });

  it("resolves WebMCP Optimization navigation through Stay, Leave, and Apply", async () => {
    mockPathname = "/optimization";
    mockHasUnappliedResult = true;
    mockOptimizationModel = {} as OpticalModel;
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );
    const getTool = (name: string) =>
      registerTool.mock.calls.find(([tool]) => tool.name === name)?.[0] as
        | WebMCP.ModelContextTool
        | undefined;
    const setActivePage = getTool("set_active_page");
    const resolveNavigation = getTool("resolve_optimization_navigation");
    const execute = async (tool: WebMCP.ModelContextTool, input: unknown) =>
      tool.execute(input as Record<string, unknown>, {
        signal: new AbortController().signal,
      });

    await act(async () => {
      await execute(setActivePage!, { page: "settings" });
    });
    let result: unknown;
    await act(async () => {
      result = await execute(resolveNavigation!, { action: "stay" });
    });
    expect(JSON.parse(String(result))).toEqual({ status: "stayed" });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockUnappliedModalProps?.isOpen).toBe(false);

    await act(async () => {
      await execute(setActivePage!, { page: "settings" });
    });
    await act(async () => {
      result = await execute(resolveNavigation!, { action: "leave" });
    });
    expect(JSON.parse(String(result))).toEqual({
      status: "left",
      page: "settings",
    });
    expect(mockPush).toHaveBeenCalledWith("/settings");

    mockPush.mockClear();
    mockPathname = "/optimization";
    await act(async () => {
      await execute(setActivePage!, { page: "settings" });
    });
    mockApplyOptimizationModelToEditor.mockResolvedValue(undefined);
    await act(async () => {
      result = await execute(resolveNavigation!, {
        action: "apply_to_editor",
      });
    });
    expect(JSON.parse(String(result))).toEqual({
      status: "applied_and_left",
      page: "settings",
    });
    expect(mockApplyOptimizationModelToEditor).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it.each(["before apply", "during aperture extraction"] as const)(
    "preserves the editor, result, and pending navigation when Apply is cancelled %s",
    async (cancellationTime) => {
      mockPathname = "/optimization";
      mockHasUnappliedResult = true;
      mockOptimizationModel = {
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
      const { applyOptimizationModelToEditor } = jest.requireActual<
        typeof import("@/features/optimization/lib/applyOptimizationModelToEditor")
      >("@/features/optimization/lib/applyOptimizationModelToEditor");
      mockApplyOptimizationModelToEditor.mockImplementation((params) =>
        applyOptimizationModelToEditor(
          params as Parameters<typeof applyOptimizationModelToEditor>[0],
        ),
      );
      let resolveAperture!: (values: number[]) => void;
      mockGetSurfaceSemiDiameters.mockReturnValue(
        new Promise<number[]>((resolve) => {
          resolveAperture = resolve;
        }),
      );
      const registerTool = jest.fn().mockResolvedValue(undefined);
      setModelContext({ registerTool });
      render(
        <AppShell>
          <div>Route body</div>
        </AppShell>,
      );
      const getTool = (name: string) =>
        registerTool.mock.calls.find(
          ([tool]) => tool.name === name,
        )![0] as WebMCP.ModelContextTool;
      await act(async () => {
        await getTool("set_active_page").execute(
          { page: "settings" },
          { signal: new AbortController().signal },
        );
      });
      const initialLensState = mockLensStore.getState();
      const initialSpecsState = mockSpecsStore.getState();
      const controller = new AbortController();
      if (cancellationTime === "before apply") controller.abort();
      let application!: Promise<unknown>;
      await act(async () => {
        application = Promise.resolve(
          getTool("resolve_optimization_navigation").execute(
            { action: "apply_to_editor" },
            { signal: controller.signal },
          ),
        );
        void application.catch(() => undefined);
      });
      if (cancellationTime === "during aperture extraction") {
        expect(mockGetSurfaceSemiDiameters).toHaveBeenCalledWith(
          mockOptimizationModel,
        );
        controller.abort();
        await act(async () => {
          resolveAperture([100, 6, 200]);
          await application.catch(() => undefined);
        });
      } else {
        expect(mockGetSurfaceSemiDiameters).not.toHaveBeenCalled();
      }

      await expect(application).rejects.toMatchObject({ name: "AbortError" });
      expect(mockLensStore.getState()).toBe(initialLensState);
      expect(mockSpecsStore.getState()).toBe(initialSpecsState);
      expect(mockHasUnappliedResult).toBe(true);
      expect(mockMarkResultApplied).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockUnappliedModalProps?.isOpen).toBe(true);
      const page = await getTool("get_active_page").execute(
        {},
        { signal: new AbortController().signal },
      );
      expect(JSON.parse(String(page))).toEqual({
        page: "optimization",
        pendingNavigation: "settings",
      });
    },
  );

  it("navigates directly for non-Optimization WebMCP requests", async () => {
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );
    const setActivePage = registerTool.mock.calls.find(
      ([tool]) => tool.name === "set_active_page",
    )?.[0] as WebMCP.ModelContextTool;

    const result = await act(async () =>
      setActivePage.execute(
        { page: "about" },
        { signal: new AbortController().signal },
      ),
    );

    expect(JSON.parse(String(result))).toEqual({
      status: "navigated",
      page: "about",
    });
    expect(mockPush).toHaveBeenCalledWith("/about");
  });

  it("reports no pending navigation without changing route state", async () => {
    const registerTool = jest.fn().mockResolvedValue(undefined);
    setModelContext({ registerTool });
    render(
      <AppShell>
        <div>Route body</div>
      </AppShell>,
    );
    const resolveNavigation = registerTool.mock.calls.find(
      ([tool]) => tool.name === "resolve_optimization_navigation",
    )?.[0] as WebMCP.ModelContextTool;

    const result = await resolveNavigation.execute(
      { action: "leave" },
      { signal: new AbortController().signal },
    );

    expect(JSON.parse(String(result))).toEqual({
      status: "no_pending_navigation",
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
