import { act, renderHook, waitFor } from "@testing-library/react";
import type { InitProgress } from "@/shared/hooks/usePyodide";

// Mock proxy methods
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockProxy = {
  init: mockInit,
  getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
  plotLensLayout: jest.fn().mockResolvedValue("base64-layout"),
  plotRayFan: jest.fn().mockResolvedValue("base64-rayfan"),
  getRayFanData: jest.fn().mockResolvedValue([]),
  plotOpdFan: jest.fn().mockResolvedValue("base64-opdfan"),
  getOpdFanData: jest.fn().mockResolvedValue([]),
  plotSpotDiagram: jest.fn().mockResolvedValue("base64-spot"),
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

import { usePyodide, _resetSingleton } from "@/shared/hooks/usePyodide";

beforeEach(() => {
  jest.clearAllMocks();
  _resetSingleton();
});

describe("usePyodide", () => {
  it("returns isReady=false initially", async () => {
    const { result } = renderHook(() => usePyodide());
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeUndefined();
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
    expect(result.current.proxy!.getFirstOrderData).toBeDefined();
    expect(result.current.proxy!.plotLensLayout).toBeDefined();
  });

  it("sets error state when init fails", async () => {
    mockInit.mockRejectedValueOnce(new Error("init failed"));
    const { result } = renderHook(() => usePyodide());

    await waitFor(() => {
      expect(result.current.error).toBe("init failed");
    });
    expect(result.current.isReady).toBe(false);
  });

  it("creates only one worker (singleton) across multiple hook instances", async () => {
    const { result: r1 } = renderHook(() => usePyodide());
    renderHook(() => usePyodide());

    await waitFor(() => {
      expect(r1.current.isReady).toBe(true);
    });
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("forwards worker progress callback into hook state", async () => {
    let onProgress: ((progress: InitProgress) => void) | undefined;
    mockInit.mockImplementationOnce(async (callback?: (progress: InitProgress) => void) => {
      onProgress = callback;
    });

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
});
