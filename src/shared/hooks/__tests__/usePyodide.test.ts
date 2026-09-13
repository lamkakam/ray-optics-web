import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, StrictMode, type ReactNode } from "react";
import type { InitProgress } from "@/shared/hooks/usePyodide";

// Mock proxy methods
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockProxy = {
  init: mockInit,
  getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
  plotLensLayout: jest.fn().mockResolvedValue("base64-layout"),
  getRayFanData: jest.fn().mockResolvedValue([]),
  getOpdFanData: jest.fn().mockResolvedValue([]),
  getSpotDiagramData: jest.fn().mockResolvedValue([]),
};

// Mock createPyodideWorker (avoids import.meta.url)
jest.mock("@/workers/createPyodideWorker", () => ({
  createPyodideWorker: jest.fn(() => ({ terminate: jest.fn() })),
}));

jest.mock("comlink", () => ({
  proxy: jest.fn((callback: (progress: InitProgress) => void) => callback),
  wrap: jest.fn(() => mockProxy),
}));

import {
  usePyodide,
  _resetSingleton,
  withAnalysisCacheInvalidation,
} from "@/shared/hooks/usePyodide";
import { getCachedAnalysis } from "@/features/analysis/lib/analysisCache";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import { createPyodideWorker } from "@/workers/createPyodideWorker";
import { wrap } from "comlink";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  _resetSingleton();
});

describe("usePyodide", () => {
  it("returns isReady=false initially", async () => {
    const { result } = renderHook(() => usePyodide());
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.initProgress).toEqual({
      value: 0,
      status: "Starting worker",
    });
    await act(async () => {}); // flush setIsReady(true) microtask
  });

  it("exposes initial progress before ready", async () => {
    const { result } = renderHook(() => usePyodide());

    expect(result.current.initProgress).toEqual({
      value: 0,
      status: "Starting worker",
    });

    await act(async () => {});
  });

  it("calls init and sets isReady=true after mount", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("returns the proxy object when ready", async () => {
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.proxy).toBeDefined();
    expect(result.current.proxy?.getFirstOrderData).toBeDefined();
    expect(result.current.proxy?.plotLensLayout).toBeDefined();
  });

  it("sets error state when init fails", async () => {
    mockInit.mockRejectedValueOnce(new Error("init failed"));
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.error).toBe("init failed");
    });
    expect(result.current.isReady).toBe(false);
  });

  it("uses a stable fallback message for non-Error initialization failures", async () => {
    mockInit.mockRejectedValueOnce("plain failure");
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.error).toBe("Unknown error");
    });
  });

  it("creates only one worker (singleton) across multiple hook instances", async () => {
    const { result: r1 } = renderHook(() => usePyodide());
    const { result: r2 } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(r1.current.isReady).toBe(true);
    });
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(r1.current.proxy).toBe(r2.current.proxy);
    expect(createPyodideWorker).toHaveBeenCalledTimes(1);
    expect(wrap).toHaveBeenCalledTimes(1);
  });

  it("does not initialize twice when a hook rerenders", async () => {
    const { result, rerender } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    rerender();

    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("initializes only once when React replays effects in StrictMode", async () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { result } = renderHook(() => usePyodide(), { wrapper });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("forwards worker progress callback into hook state", async () => {
    let onProgress: ((progress: InitProgress) => void) | undefined;
    mockInit.mockImplementationOnce(
      async (callback?: (progress: InitProgress) => void) => {
        onProgress = callback;
      },
    );

    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(onProgress).toBeDefined();
    });

    act(() => {
      onProgress?.({ value: 40, status: "Loading Pyodide packages" });
    });

    expect(result.current.initProgress).toEqual({
      value: 40,
      status: "Loading Pyodide packages",
    });

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
  });

  it("clears cached analyses before and after successful or rejected custom-glass mutations", async () => {
    const raw = {
      addUserDefinedGlasses: jest.fn().mockResolvedValue({}),
      updateUserDefinedGlasses: jest
        .fn()
        .mockRejectedValue(new Error("partial mutation")),
      deleteUserDefinedGlasses: jest.fn().mockResolvedValue(undefined),
    } as unknown as import("@/shared/hooks/usePyodide").PyodideWorkerAPI;
    const proxy = withAnalysisCacheInvalidation(raw);
    const model = {} as OpticalModel;
    const load = jest.fn().mockResolvedValue("analysis");

    await getCachedAnalysis(model, "chief_ray", "firstOrder", load);
    await proxy.addUserDefinedGlasses([]);
    await getCachedAnalysis(model, "chief_ray", "firstOrder", load);
    await expect(proxy.updateUserDefinedGlasses([])).rejects.toThrow(
      "partial mutation",
    );
    await getCachedAnalysis(model, "chief_ray", "firstOrder", load);
    await proxy.deleteUserDefinedGlasses([]);
    await getCachedAnalysis(model, "chief_ray", "firstOrder", load);

    expect(load).toHaveBeenCalledTimes(4);
  });
});
