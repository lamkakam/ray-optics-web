/**
 * Exercises the AppShell navigation callback at its public Layout boundary.
 * The boundary mock intentionally invokes the callback both with and without
 * a mouse event so its return value and optional event handling are observable.
 */
import type React from "react";
import { act, render } from "@testing-library/react";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import AppShell from "@/app/AppShell";

const mockPush = jest.fn<void, [string]>();
let mockPathname = "/";
let mockHasUnappliedResult = false;
let mockOptimizationModel: OpticalModel | undefined;
let mockCapturedOnNavigate: ((href: string, event?: React.MouseEvent<HTMLAnchorElement>) => boolean) | undefined;
let mockUnappliedModalProps: {
  readonly isOpen: boolean;
  readonly onLeave: () => void;
  readonly onApplyToEditor: () => void;
} | undefined;

const mockGlassMapStore = {
  getState: () => ({ catalogsData: {}, lookupMaps: undefined }),
};
const mockOptimizationStore = {
  getState: () => ({
    hasUnappliedOptimizationResult: mockHasUnappliedResult,
    optimizationModel: mockOptimizationModel,
    markOptimizationResultAppliedToEditor: jest.fn(),
  }),
};
const mockProxy = {} as PyodideWorkerAPI;

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("zustand", () => ({
  useStore: <State, Selected>(store: { getState: () => State }, selector: (state: State) => Selected) =>
    selector(store.getState()),
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
  useLensEditorStore: () => ({ getState: jest.fn() }),
}));

jest.mock("@/features/lens-editor/providers/SpecsConfiguratorStoreProvider", () => ({
  useSpecsConfiguratorStore: () => ({ getState: jest.fn() }),
}));

jest.mock("@/features/optimization/providers/OptimizationStoreProvider", () => ({
  useOptimizationStore: () => mockOptimizationStore,
}));

jest.mock("@/features/glass-map/providers/GlassMapStoreProvider", () => ({
  useGlassMapStore: () => mockGlassMapStore,
}));

const mockApplyOptimizationModelToEditor = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
jest.mock("@/features/optimization/lib/applyOptimizationModelToEditor", () => ({
  applyOptimizationModelToEditor: (...args: [unknown]) => mockApplyOptimizationModelToEditor(...args),
}));

jest.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({ children, onNavigate }: { readonly children: React.ReactNode; readonly onNavigate?: typeof mockCapturedOnNavigate }) => {
    mockCapturedOnNavigate = onNavigate;
    return <>{children}</>;
  },
}));

jest.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
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
    mockPathname = "/";
    mockHasUnappliedResult = false;
    mockOptimizationModel = undefined;
    mockApplyOptimizationModelToEditor.mockClear();
    mockCapturedOnNavigate = undefined;
    mockUnappliedModalProps = undefined;
  });

  it("returns true and navigates when called without a mouse event", () => {
    render(<AppShell><div>Route body</div></AppShell>);
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
    render(<AppShell><div>Route body</div></AppShell>);
    const preventDefault = jest.fn();
    const event = { preventDefault } as unknown as React.MouseEvent<HTMLAnchorElement>;
    let result: boolean | undefined;

    act(() => {
      result = mockCapturedOnNavigate?.("/about", event);
    });

    expect(result).toBe(false);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores a leave callback when no navigation is pending", () => {
    render(<AppShell><div>Route body</div></AppShell>);

    act(() => {
      mockUnappliedModalProps?.onLeave();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not apply a model when the apply callback has no pending destination", () => {
    mockOptimizationModel = {} as OpticalModel;
    render(<AppShell><div>Route body</div></AppShell>);

    act(() => {
      mockUnappliedModalProps?.onApplyToEditor();
    });

    expect(mockApplyOptimizationModelToEditor).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
