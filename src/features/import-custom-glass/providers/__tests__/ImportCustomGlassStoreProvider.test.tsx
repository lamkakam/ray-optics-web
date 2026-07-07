import { renderHook } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import {
  ImportCustomGlassStoreContext,
  ImportCustomGlassStoreProvider,
  useImportCustomGlassStore,
} from "@/features/import-custom-glass/providers/ImportCustomGlassStoreProvider";
import {
  createImportCustomGlassSlice,
  type ImportCustomGlassStore,
} from "@/features/import-custom-glass/stores/importCustomGlassStore";

describe("ImportCustomGlassStoreProvider", () => {
  it("useImportCustomGlassStore returns the store when inside ImportCustomGlassStoreProvider", () => {
    const { result } = renderHook(() => useImportCustomGlassStore(), {
      wrapper: ({ children }) => (
        <ImportCustomGlassStoreProvider>{children}</ImportCustomGlassStoreProvider>
      ),
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.getState).toBe("function");
  });

  it("useImportCustomGlassStore throws when called outside ImportCustomGlassStoreProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useImportCustomGlassStore());
    }).toThrow("`useImportCustomGlassStore` must be used within `ImportCustomGlassStoreProvider`");

    consoleSpy.mockRestore();
  });

  it("store returned is a singleton within the same provider", () => {
    const { result, rerender } = renderHook(() => useImportCustomGlassStore(), {
      wrapper: ({ children }) => (
        <ImportCustomGlassStoreProvider>{children}</ImportCustomGlassStoreProvider>
      ),
    });

    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });

  it("direct ImportCustomGlassStoreContext.Provider injection works", () => {
    const store = createStore<ImportCustomGlassStore>(createImportCustomGlassSlice);
    const { result } = renderHook(() => useImportCustomGlassStore(), {
      wrapper: ({ children }) => (
        <ImportCustomGlassStoreContext.Provider value={store}>
          {children}
        </ImportCustomGlassStoreContext.Provider>
      ),
    });

    expect(result.current).toBe(store);
  });
});
