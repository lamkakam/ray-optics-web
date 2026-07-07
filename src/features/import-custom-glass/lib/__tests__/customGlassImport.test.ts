import {
  EMPTY_CUSTOM_GLASSES,
  getUserDefinedCustomGlasses,
  isUserDefinedGlassAlreadyExistsError,
  makeEditablePair,
  parseCustomGlassCsv,
  saveCustomGlass,
} from "@/features/import-custom-glass/lib/customGlassImport";
import type { UserDefinedGlassData } from "@/features/glass-map/types/glassMap";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";

const customGlass: UserDefinedGlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_fe: 0.4, P_Fd: 0.41, P_gF: 0.5349 },
  dispersionCoeffKind: "tabulated",
  dispersionCoeffs: [[587.56, 1.5168]],
};

describe("makeEditablePair", () => {
  it("creates unique blank editable rows with incremental ids when crypto.randomUUID is unavailable", () => {
    const originalRandomUUID = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      const first = makeEditablePair();
      const second = makeEditablePair();

      expect(first).toMatchObject({
        fraunhofer: "",
        wavelength: "",
        refractiveIndex: "",
      });
      expect(first.id).toMatch(/^row-custom-glass-\d+$/);
      expect(second.id).toBe(`row-custom-glass-${Number(first.id.replace("row-custom-glass-", "")) + 1}`);
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: originalRandomUUID,
      });
    }
  });
});

describe("getUserDefinedCustomGlasses", () => {
  it("returns a stable empty object when Custom catalog data is missing", () => {
    expect(getUserDefinedCustomGlasses(undefined)).toBe(EMPTY_CUSTOM_GLASSES);
  });

  it("returns the same Custom catalog reference when every entry is user-defined", () => {
    const customCatalog = { CUSTOM_A: customGlass };

    expect(getUserDefinedCustomGlasses(customCatalog)).toBe(customCatalog);
  });
});

describe("isUserDefinedGlassAlreadyExistsError", () => {
  it("detects worker duplicate user-defined glass errors", () => {
    expect(isUserDefinedGlassAlreadyExistsError(new Error("ValueError: User-defined glass already exists: test"))).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isUserDefinedGlassAlreadyExistsError(new Error("KeyError: test"))).toBe(false);
  });
});

describe("saveCustomGlass", () => {
  it("renames edited glass by adding the new worker label and deleting the previous store label", async () => {
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({ RENAMED: customGlass });
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    const updateUserDefinedGlasses = jest.fn();
    const getUserDefinedGlasses = jest.fn();
    const upsertCustomGlasses = jest.fn();
    const deleteCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: {
        name: "RENAMED",
        pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
      },
      proxy: {
        addUserDefinedGlasses,
        deleteUserDefinedGlasses,
        updateUserDefinedGlasses,
        getUserDefinedGlasses,
      } as unknown as PyodideWorkerAPI,
      storeActions: {
        upsertCustomGlasses,
        deleteCustomGlasses,
      },
    });

    expect(addUserDefinedGlasses).toHaveBeenCalledWith([{
      name: "RENAMED",
      pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
    }]);
    expect(deleteUserDefinedGlasses).toHaveBeenCalledWith(["ORIGINAL"]);
    expect(updateUserDefinedGlasses).not.toHaveBeenCalled();
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ RENAMED: customGlass });
    expect(deleteCustomGlasses).toHaveBeenCalledWith(["ORIGINAL"]);
  });
});

describe("parseCustomGlassCsv", () => {
  it("converts CSV micrometer wavelengths to nanometers without floating-point artifacts", () => {
    const result = parseCustomGlassCsv(
      new File([], "LF7.csv", { type: "text/csv" }),
      "wl,n\n0.48613,1.522\n0.54607,1.518\n0.58756,1.5168\n0.6943,1.514\n",
    );

    expect(result).toEqual({
      name: "LF7",
      pairs: [[486.13, 1.522], [546.07, 1.518], [587.56, 1.5168], [694.3, 1.514]],
    });
  });
});
