import React from "react";
import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";
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
    const store = createStore<GlassMapStore>(createGlassMapSlice());
    const { result } = renderHook(() => useGlassMapStore(), {
      wrapper: ({ children }) => (
        <GlassMapStoreContext.Provider value={store}>
          {children}
        </GlassMapStoreContext.Provider>
      ),
    });
    expect(result.current).toBe(store);
  });

  it("applies a route intent when catalog data is committed", async () => {
    const { result } = renderHook(() => useGlassMapStore(), {
      wrapper: ({ children }) => (
        <GlassMapStoreProvider>{children}</GlassMapStoreProvider>
      ),
    });

    const { normalizeAllCatalogsData } = await import("@/shared/lib/types/glassMap");
    const rawData = {
      Schott: {
        "N-BK7": {
          refractive_index_d: 1.5168,
          refractive_index_e: 1.519,
          abbe_number_d: 64.17,
          abbe_number_e: 63.96,
          partial_dispersions: { P_g_F: 0.5349, P_F_d: 0.41, P_F_e: 0.4 },
          dispersion_coeff_kind: "Sellmeier3T" as const,
          dispersion_coeffs: [1.03961212, 0.231792344, 1.01046945, 0.00600069867, 0.0200179144, 103.560653],
        },
      },
      CDGM: {},
      Hikari: {},
      Hoya: {},
      Ohara: {},
      Sumita: {},
    };

    act(() => {
      result.current.getState().setRouteIntent({
        source: "medium-selector",
        catalog: "Schott",
        glass: "N-BK7",
      });
    });

    act(() => {
      result.current.getState().setCatalogsData(normalizeAllCatalogsData(rawData));
    });

    expect(result.current.getState().enabledCatalogs.Schott).toBe(true);
    expect(result.current.getState().selectedGlass?.glassName).toBe("N-BK7");
  });
});
