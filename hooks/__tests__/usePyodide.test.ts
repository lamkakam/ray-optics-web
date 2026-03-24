import { renderHook, waitFor } from "@testing-library/react";

// Mock proxy methods
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockProxy = {
  init: mockInit,
  getFirstOrderData: jest.fn().mockResolvedValue({ efl: 100 }),
  plotLensLayout: jest.fn().mockResolvedValue("base64-layout"),
  plotRayFan: jest.fn().mockResolvedValue("base64-rayfan"),
  plotOpdFan: jest.fn().mockResolvedValue("base64-opdfan"),
  plotSpotDiagram: jest.fn().mockResolvedValue("base64-spot"),
};

// Mock createPyodideWorker (avoids import.meta.url)
jest.mock("@/hooks/createPyodideWorker", () => ({
  createPyodideWorker: jest.fn(() => ({ terminate: jest.fn() })),
}));

jest.mock("comlink", () => ({
  wrap: jest.fn(() => mockProxy),
}));

import { usePyodide, _resetSingleton } from "@/hooks/usePyodide";

beforeEach(() => {
  jest.clearAllMocks();
  _resetSingleton();
});

describe("usePyodide", () => {
  it("returns isReady=false initially", () => {
    const { result } = renderHook(() => usePyodide());
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeUndefined();
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
});
