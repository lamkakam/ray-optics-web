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
import {
  CALCULATION_FAILED_MESSAGE,
  INITIALIZATION_FAILED_MESSAGE,
  normalizePyodideError,
} from "@/shared/lib/pyodideErrors";

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  _resetSingleton();
  jest.restoreAllMocks();
});

/** Hook startup exposes safe errors and records each expected initialization failure once. */
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
    const failure = new Error("init failed");
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockInit.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.error).toBe(INITIALIZATION_FAILED_MESSAGE);
    });
    expect(result.current.isReady).toBe(false);
    expect(console.error).toHaveBeenCalledWith("[Pyodide:init]", failure);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("uses a stable fallback message for non-Error initialization failures", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockInit.mockRejectedValueOnce("plain failure");
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.error).toBe(INITIALIZATION_FAILED_MESSAGE);
    });
    expect(console.error).toHaveBeenCalledWith(
      "[Pyodide:init]",
      "plain failure",
    );
    expect(console.error).toHaveBeenCalledTimes(1);
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

/** Worker creation and shared cached transport failures use one sanitized boundary. */
describe("client error fallback", () => {
  it("catches synchronous worker creation failure once for every mounted consumer", async () => {
    const original = new Error("private worker creation detail");
    jest.mocked(createPyodideWorker).mockImplementationOnce(() => {
      throw original;
    });
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const first = renderHook(() => usePyodide());
    const second = renderHook(() => usePyodide());
    await waitFor(() =>
      expect(first.result.current.error).toBe(INITIALIZATION_FAILED_MESSAGE),
    );
    expect(second.result.current.error).toBe(INITIALIZATION_FAILED_MESSAGE);
    expect(log).toHaveBeenCalledWith("[Pyodide:init]", original);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("logs shared cached transport rejection once and exposes only safe text", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const original = new Error("private transport fault");
    mockProxy.getFirstOrderData.mockRejectedValueOnce(original);
    const { result } = renderHook(() => usePyodide());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const request = () =>
      result.current.proxy!.getFirstOrderData({} as OpticalModel);
    const model = {} as OpticalModel;
    const first = getCachedAnalysis(model, "chief_ray", "safe-error", request);
    const second = getCachedAnalysis(model, "chief_ray", "safe-error", request);
    expect(first).toBe(second);
    await expect(first).rejects.toMatchObject({
      name: "PyodideFatalError",
      message: CALCULATION_FAILED_MESSAGE,
    });
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("does not log an already normalized worker rejection again", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    const safe = normalizePyodideError(
      new Error(
        "ProjectedPupilGeometryError: Projected-pupil mapping contains a fold or orientation reversal.",
      ),
      "getFirstOrderData",
    );
    mockProxy.getFirstOrderData.mockRejectedValueOnce(safe);
    const { result } = renderHook(() => usePyodide());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await expect(
      result.current.proxy!.getFirstOrderData({} as OpticalModel),
    ).rejects.toBe(safe);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });
});
