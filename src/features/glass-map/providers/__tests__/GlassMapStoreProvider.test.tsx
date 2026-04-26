import { renderHook } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import {
  GlassMapStoreProvider,
  GlassMapStoreContext,
  useGlassMapStore,
} from "@/features/glass-map/providers/GlassMapStoreProvider";
import { createGlassMapSlice, type GlassMapStore } from "@/features/glass-map/stores/glassMapStore";

describe("GlassMapStoreProvider", () => {
  it("useGlassMapStore returns the store when inside GlassMapStoreProvider", () => {
    const { result } = renderHook(() => useGlassMapStore(), {
      wrapper: ({ children }) => (
        <GlassMapStoreProvider>{children}</GlassMapStoreProvider>
      ),
    });
    expect(result.current).toBeDefined();
    expect(typeof result.current.getState).toBe("function");
  });

  it("useGlassMapStore throws when called outside GlassMapStoreProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useGlassMapStore());
    }).toThrow("`useGlassMapStore` must be used within `GlassMapStoreProvider`");
    consoleSpy.mockRestore();
  });

  it("store returned is a singleton (same reference across two calls within the same provider)", () => {
    const { result, rerender } = renderHook(
      () => useGlassMapStore(),
      {
        wrapper: ({ children }) => (
          <GlassMapStoreProvider>{children}</GlassMapStoreProvider>
        ),
      }
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("direct GlassMapStoreContext.Provider injection works (for other test files)", () => {
    const store = createStore<GlassMapStore>(createGlassMapSlice);
    const { result } = renderHook(() => useGlassMapStore(), {
      wrapper: ({ children }) => (
        <GlassMapStoreContext.Provider value={store}>
          {children}
        </GlassMapStoreContext.Provider>
      ),
    });
    expect(result.current).toBe(store);
  });
  it("exposes only persistent UI state actions", () => {
    const { result } = renderHook(() => useGlassMapStore(), {
      wrapper: ({ children }) => (
        <GlassMapStoreProvider>{children}</GlassMapStoreProvider>
      ),
    });

    expect(result.current.getState().setPlotType).toBeDefined();
    expect(result.current.getState().toggleCatalog).toBeDefined();
    expect(result.current.getState().setSelectedGlass).toBeDefined();
    expect((result.current.getState() as unknown as Record<string, unknown>).setRouteIntent).toBeUndefined();
    expect((result.current.getState() as unknown as Record<string, unknown>).setCatalogsData).toBeUndefined();
  });
});
