/** Verifies persistent registrations return direct catalog lookups from the current store. */
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { createStore } from "zustand";
import { useGlassCatalogWebMCP } from "@/app/hooks/useGlassCatalogWebMCP";
import { GlassMapStoreContext } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";

function setModelContext(
  value: Pick<WebMCP.ModelContext, "registerTool"> | undefined,
) {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value,
  });
}

describe("useGlassCatalogWebMCP", () => {
  afterEach(() => setModelContext(undefined));

  it("keeps one registration across catalog updates and aborts it on unmount", async () => {
    const registerTool = jest.fn(
      async (
        _tool: WebMCP.ModelContextTool,
        _options?: WebMCP.ModelContextRegisterToolOptions,
      ) => undefined,
    );
    setModelContext({ registerTool });
    const store = createStore(createGlassMapSlice);
    const { rerender, unmount } = renderHook(() => useGlassCatalogWebMCP(), {
      wrapper: ({ children }: { readonly children: ReactNode }) => (
        <GlassMapStoreContext value={store}>{children}</GlassMapStoreContext>
      ),
    });
    const [tool, options] = registerTool.mock.calls[0];
    await expect(
      Promise.resolve().then(() =>
        tool.execute({}, { signal: new AbortController().signal }),
      ),
    ).rejects.toThrow(/catalog.*load/i);
    store.getState().setCatalogsData({});
    rerender();
    expect(
      await tool.execute({}, { signal: new AbortController().signal }),
    ).toEqual({
      CDGM: {},
      Hikari: {},
      Hoya: {},
      Ohara: {},
      Schott: {},
      Sumita: {},
      Special: {},
      Custom: {},
    });
    store.getState().toggleCatalog("Schott");
    rerender();
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(options?.signal?.aborted).toBe(false);
    unmount();
    expect(options?.signal?.aborted).toBe(true);
  });

  it("renders without WebMCP support", () => {
    setModelContext(undefined);
    const store = createStore(createGlassMapSlice);
    expect(() =>
      renderHook(() => useGlassCatalogWebMCP(), {
        wrapper: ({ children }: { readonly children: ReactNode }) => (
          <GlassMapStoreContext value={store}>{children}</GlassMapStoreContext>
        ),
      }),
    ).not.toThrow();
  });
});
