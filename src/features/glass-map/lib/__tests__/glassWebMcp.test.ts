/** Exercises the global glass query against live, unfiltered catalog data. */
import { createStore } from "zustand";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";
import type {
  GlassData,
  UserDefinedGlassData,
} from "@/features/glass-map/types/glassMap";
import { createGetAllGlassesTool } from "@/features/glass-map/lib/glassWebMcp";

const glass: GlassData = {
  refractiveIndexD: 1.516800123456,
  refractiveIndexE: 1.518723456789,
  abbeNumberD: 64.16723456789,
  abbeNumberE: 63.89234567891,
  partialDispersions: {
    P_fe: 0.30234567891,
    P_Fd: 0.69345678912,
    P_gF: 0.53456789123,
  },
  dispersionCoeffKind: "Sellmeier3T",
  dispersionCoeffs: [1, 2, 3, 4, 5, 6],
};
const customGlass: UserDefinedGlassData = {
  ...glass,
  dispersionCoeffKind: "tabulated",
  dispersionCoeffs: [
    [400, 1.6],
    [700, 1.5],
  ],
};

function setup() {
  const store = createStore(createGlassMapSlice);
  const tool = createGetAllGlassesTool(store);
  const execute = async (
    input: unknown = {},
    signal = new AbortController().signal,
  ) => tool.execute(input as Record<string, unknown>, { signal });
  return { store, tool, execute };
}

describe("get_all_glasses", () => {
  it("returns full precision properties from every catalog, including hidden catalogs and duplicate names", async () => {
    const { store, tool, execute } = setup();
    store.getState().setCatalogsData({
      Schott: { BK7: glass },
      Hoya: { BK7: glass },
      Custom: { BK7: customGlass },
    });
    store.getState().toggleCatalog("Hoya");
    store.getState().toggleCatalog("Custom");
    const before = store.getState();
    const result = await execute();
    expect(typeof result).toBe("string");
    expect(JSON.parse(String(result))).toEqual({
      glasses: ["Hoya", "Schott", "Custom"].map((catalog) => ({
        glass: "BK7",
        catalog,
        nd: 1.516800123456,
        vd: 64.16723456789,
        ne: 1.518723456789,
        ve: 63.89234567891,
        P_gF: 0.53456789123,
        P_Fe: 0.30234567891,
        P_Fd: 0.69345678912,
      })),
    });
    expect(store.getState()).toBe(before);
    expect(tool.name).toBe("get_all_glasses");
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
  });

  it("reads additions, edits, deletions, and catalog replacements on every invocation", async () => {
    const { store, execute } = setup();
    store.getState().setCatalogsData({});
    expect(JSON.parse(String(await execute()))).toEqual({ glasses: [] });
    store.getState().upsertCustomGlasses({ Test: customGlass });
    expect(JSON.parse(String(await execute())).glasses).toEqual([
      expect.objectContaining({ glass: "Test", nd: glass.refractiveIndexD }),
    ]);
    store
      .getState()
      .upsertCustomGlasses({ Test: { ...customGlass, refractiveIndexD: 1.7 } });
    expect(JSON.parse(String(await execute())).glasses).toEqual([
      expect.objectContaining({ glass: "Test", nd: 1.7 }),
    ]);
    store.getState().deleteCustomGlasses(["Test"]);
    expect(JSON.parse(String(await execute()))).toEqual({ glasses: [] });
    store.getState().setCatalogsData({ Schott: { New: glass } });
    expect(JSON.parse(String(await execute())).glasses).toEqual([
      expect.objectContaining({ catalog: "Schott", glass: "New" }),
    ]);
  });

  it("explains that catalog loading must finish before querying", async () => {
    await expect(setup().execute()).rejects.toThrow(
      /catalog.*load|load.*catalog/i,
    );
  });

  it.each([undefined, null, [], "", { catalog: "Schott" }])(
    "rejects nonempty or invalid input: %p",
    async (input) => {
      const { store, tool } = setup();
      store.getState().setCatalogsData({});
      await expect(
        Promise.resolve().then(() =>
          tool.execute(input as Record<string, unknown>, {
            signal: new AbortController().signal,
          }),
        ),
      ).rejects.toThrow("Invalid input at /");
    },
  );

  it("rejects cancellation before reading catalogs", async () => {
    const { execute, store } = setup();
    const getState = jest.spyOn(store, "getState");
    const controller = new AbortController();
    controller.abort();
    await expect(execute({}, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(getState).not.toHaveBeenCalled();
  });
});
