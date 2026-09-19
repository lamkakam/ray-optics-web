/**
 * Exercises direct catalog/name lookups, canonical naming guidance, and isolated
 * snapshots of live, unfiltered catalog data, plus validation and cancellation.
 */
import { createStore } from "zustand";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";
import type {
  GlassData,
  UserDefinedGlassData,
} from "@/features/glass-map/types/glassMap";
import {
  createGetAllGlassesTool,
  type GetAllGlassesResponse,
} from "@/features/glass-map/lib/glassWebMcp";

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
  ) =>
    (await tool.execute(input as Record<string, unknown>, {
      signal,
    })) as GetAllGlassesResponse;
  return { store, tool, execute };
}

describe("get_all_glasses", () => {
  it("returns direct lookups with full precision, including hidden catalogs and duplicate names", async () => {
    const { store, tool, execute } = setup();
    store.getState().setCatalogsData({
      Schott: { "N-BK7": glass },
      Hoya: { "N-BK7": { ...glass, refractiveIndexD: 1.6 } },
      Custom: { "N-BK7": { ...customGlass, refractiveIndexD: 1.7 } },
    });
    store.getState().toggleCatalog("Hoya");
    store.getState().toggleCatalog("Custom");
    const before = store.getState();
    const result = await execute();
    expect(typeof result).toBe("object");
    const properties = {
      glass: "N-BK7",
      catalog: "Schott",
      nd: 1.516800123456,
      vd: 64.16723456789,
      ne: 1.518723456789,
      ve: 63.89234567891,
      P_gF: 0.53456789123,
      P_Fe: 0.30234567891,
      P_Fd: 0.69345678912,
    };
    expect(result.Schott["N-BK7"]).toEqual(properties);
    expect(result).toEqual({
      CDGM: {},
      Hikari: {},
      Hoya: { "N-BK7": { ...properties, catalog: "Hoya", nd: 1.6 } },
      Ohara: {},
      Schott: { "N-BK7": properties },
      Sumita: {},
      Special: {},
      Custom: { "N-BK7": { ...properties, catalog: "Custom", nd: 1.7 } },
    });
    expect(store.getState()).toBe(before);
    expect(tool.name).toBe("get_all_glasses");
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: false,
    });
  });

  it("includes every canonical catalog when all catalogs are empty", async () => {
    const { store, execute } = setup();
    store.getState().setCatalogsData({});
    expect(await execute()).toEqual({
      CDGM: {},
      Hikari: {},
      Hoya: {},
      Ohara: {},
      Schott: {},
      Sumita: {},
      Special: {},
      Custom: {},
    });
  });

  it("preserves canonical whitespace and Special material names without aliases", async () => {
    const { store, execute } = setup();
    store.getState().setCatalogsData({
      Ohara: { "S-BSL 7": glass, "S-FSL 5": glass, "S-NBH 5": glass },
      Special: {
        Water: glass,
        CaF2: glass,
        "Fused Silica": glass,
        D263TECO: glass,
      },
    });
    const result = await execute();
    expect(Object.keys(result.Ohara)).toEqual([
      "S-BSL 7",
      "S-FSL 5",
      "S-NBH 5",
    ]);
    expect(Object.keys(result.Special)).toEqual([
      "Water",
      "CaF2",
      "Fused Silica",
      "D263TECO",
    ]);
    for (const name of ["S-BSL 7", "S-FSL 5", "S-NBH 5"]) {
      expect(result.Ohara[name]).toEqual(
        expect.objectContaining({ catalog: "Ohara", glass: name }),
      );
    }
    for (const name of ["Water", "CaF2", "Fused Silica", "D263TECO"]) {
      expect(result.Special[name]).toEqual(
        expect.objectContaining({ catalog: "Special", glass: name }),
      );
    }
    expect(result.Schott).toEqual({});
  });

  it("documents direct lookup, qualified Ohara spacing, and Special material locations", () => {
    const { tool } = setup();
    expect(tool.description).toContain("ret['Schott']['N-BK7']");
    expect(tool.description).toMatch(/some Ohara glasses.*but not all/i);
    expect(tool.description).toContain("single digit");
    for (const name of [
      "S-BSL7",
      "S-BSL 7",
      "S-FSL5",
      "S-FSL 5",
      "S-NBH5",
      "S-NBH 5",
    ]) {
      expect(tool.description).toContain(name);
    }
    expect(tool.description).toMatch(
      /Water.*fluorite\/fluorspar.*CaF2.*fused silica.*Fused Silica.*Schott D263 T eco.*D263TECO.*"Special"/,
    );
  });

  it("reads additions, edits, deletions, and catalog replacements on every invocation", async () => {
    const { store, execute } = setup();
    store.getState().setCatalogsData({});
    const empty = await execute();
    store.getState().upsertCustomGlasses({ Test: customGlass });
    const added = await execute();
    expect(added.Custom.Test).toEqual(
      expect.objectContaining({
        catalog: "Custom",
        glass: "Test",
        nd: glass.refractiveIndexD,
      }),
    );
    store
      .getState()
      .upsertCustomGlasses({ Test: { ...customGlass, refractiveIndexD: 1.7 } });
    expect((await execute()).Custom.Test).toEqual(
      expect.objectContaining({ glass: "Test", nd: 1.7 }),
    );
    expect(added.Custom.Test.nd).toBe(glass.refractiveIndexD);
    expect(empty.Custom).toEqual({});
    store.getState().deleteCustomGlasses(["Test"]);
    expect(await execute()).toEqual(empty);
    store.getState().setCatalogsData({ Schott: { New: glass } });
    const replaced = await execute();
    expect(replaced.Schott.New).toEqual(
      expect.objectContaining({ catalog: "Schott", glass: "New" }),
    );
    expect(replaced.Custom).toEqual({});
  });

  it("isolates mutations to the response from store data and other responses", async () => {
    const { store, execute } = setup();
    store.getState().setCatalogsData({
      Schott: { "N-BK7": glass },
      Custom: { Test: customGlass },
    });
    const result = await execute();
    const snapshot = await execute();
    result.Schott["N-BK7"].nd = 2;
    delete result.Custom.Test;
    result.Hoya.Added = { ...result.Schott["N-BK7"], glass: "Added" };
    result.Special = { Added: result.Schott["N-BK7"] };

    expect(store.getState().catalogsData).toEqual({
      CDGM: {},
      Hikari: {},
      Hoya: {},
      Ohara: {},
      Schott: { "N-BK7": glass },
      Sumita: {},
      Special: {},
      Custom: { Test: customGlass },
    });
    expect(snapshot.Schott["N-BK7"].nd).toBe(glass.refractiveIndexD);
    expect(snapshot.Custom.Test.glass).toBe("Test");
    expect(snapshot.Hoya).toEqual({});
    expect(snapshot.Special).toEqual({});
    expect(await execute()).toEqual(snapshot);
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
