import {
  customGlassStorageConstants,
  isPersistedCustomGlassRow,
  toPersistedCustomGlassRow,
} from "@/features/import-custom-glass/lib/customGlassStorage";

describe("customGlassStorage", () => {
  it("defines the IndexedDB database and store contract", () => {
    expect(customGlassStorageConstants).toEqual({
      dbName: "ray-optics-web-custom-glass",
      dbVersion: 1,
      customStore: "customGlasses",
      quarantinedStore: "quarantinedCustomGlasses",
    });
  });

  it("converts worker input to a tabulated persisted row keyed by label", () => {
    expect(toPersistedCustomGlassRow({
      name: "CUSTOM",
      pairs: [[587.56, 1.5168], [486.13, 1.522]],
    })).toEqual({
      label: "CUSTOM",
      type: "tabulated",
      pairs: [[587.56, 1.5168], [486.13, 1.522]],
    });
  });

  it("accepts only tabulated rows with finite numeric pairs", () => {
    expect(isPersistedCustomGlassRow({
      label: "CUSTOM",
      type: "tabulated",
      pairs: [[587.56, 1.5168]],
    })).toBe(true);
    expect(isPersistedCustomGlassRow({
      label: "CUSTOM",
      type: "sellmeier",
      pairs: [[587.56, 1.5168]],
    })).toBe(false);
    expect(isPersistedCustomGlassRow({
      label: "CUSTOM",
      type: "tabulated",
      pairs: [[587.56, Number.NaN]],
    })).toBe(false);
  });
});
