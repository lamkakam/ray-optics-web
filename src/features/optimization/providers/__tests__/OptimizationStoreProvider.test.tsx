import React from "react";
import { renderHook } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import {
  OptimizationStoreContext,
  OptimizationStoreProvider,
  useOptimizationStore,
} from "@/features/optimization/providers/OptimizationStoreProvider";
import {
  createOptimizationSlice,
  type OptimizationState,
} from "@/features/optimization/stores/optimizationStore";

describe("OptimizationStoreProvider", () => {
  it("useOptimizationStore returns the store when inside provider", () => {
    const { result } = renderHook(() => useOptimizationStore(), {
      wrapper: ({ children }) => (
        <OptimizationStoreProvider>{children}</OptimizationStoreProvider>
      ),
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.getState).toBe("function");
  });

  it("useOptimizationStore throws outside provider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useOptimizationStore())).toThrow(
      "`useOptimizationStore` must be used within `OptimizationStoreProvider`",
    );
    consoleSpy.mockRestore();
  });

  it("supports direct context injection for tests", () => {
    const store = createStore<OptimizationState>(createOptimizationSlice);
    const { result } = renderHook(() => useOptimizationStore(), {
      wrapper: ({ children }) => (
        <OptimizationStoreContext.Provider value={store}>
          {children}
        </OptimizationStoreContext.Provider>
      ),
    });

    expect(result.current).toBe(store);
  });
});
