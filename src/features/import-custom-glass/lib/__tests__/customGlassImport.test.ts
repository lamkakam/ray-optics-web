import {
  EMPTY_CUSTOM_GLASSES,
  formatNumber,
  getUserDefinedCustomGlasses,
  isUserDefinedGlassAlreadyExistsError,
  makeEditablePair,
  parseCustomGlassCsv,
  saveCustomGlass,
  toCustomGlassPayload,
  toWorkerInput,
} from "@/features/import-custom-glass/lib/customGlassImport";
import type { CatalogGlassData, UserDefinedGlassData } from "@/features/glass-map/types/glassMap";
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

const analyticalGlass: CatalogGlassData = {
  refractiveIndexD: 1.6,
  refractiveIndexE: 1.61,
  abbeNumberD: 50,
  abbeNumberE: 49,
  partialDispersions: { P_fe: 0.41, P_Fd: 0.42, P_gF: 0.53 },
  dispersionCoeffKind: "Sellmeier3T",
  dispersionCoeffs: [1, 2, 3],
};

const fourPairs = [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]] as const;

function makeSaveInput(name = "ADDED") {
  return { name, pairs: fourPairs } as const;
}

function makeWorker(overrides: Partial<PyodideWorkerAPI> = {}) {
  return {
    addUserDefinedGlasses: jest.fn().mockResolvedValue({ ADDED: customGlass }),
    deleteUserDefinedGlasses: jest.fn().mockResolvedValue(undefined),
    updateUserDefinedGlasses: jest.fn().mockResolvedValue({ ADDED: customGlass }),
    getUserDefinedGlasses: jest.fn().mockResolvedValue({ ADDED: customGlass }),
    ...overrides,
  } as unknown as PyodideWorkerAPI;
}

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

  it("formats an existing finite pair and clears non-finite draft values", () => {
    expect(makeEditablePair([587.56, 1.5168])).toMatchObject({
      fraunhofer: "",
      wavelength: "587.56",
      refractiveIndex: "1.5168",
    });
    expect(makeEditablePair([Number.NaN, Number.POSITIVE_INFINITY])).toMatchObject({
      wavelength: "",
      refractiveIndex: "",
    });
  });
});

describe("formatNumber, toWorkerInput, and toCustomGlassPayload", () => {
  it("formats finite numbers and maps non-finite numbers to blank drafts", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(-1.25)).toBe("-1.25");
    expect(formatNumber(Number.NaN)).toBe("");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("trims the label and converts editable string rows to worker pairs", () => {
    expect(toWorkerInput("  CUSTOM  ", [
      { id: "a", fraunhofer: "d", wavelength: " 587.56 ", refractiveIndex: "1.5168" },
      { id: "b", fraunhofer: "", wavelength: "", refractiveIndex: "0" },
    ])).toEqual({
      name: "CUSTOM",
      pairs: [[587.56, 1.5168], [0, 0]],
    });
  });

  it("builds a versioned JSON payload for every custom glass", () => {
    expect(toCustomGlassPayload({ FIRST: customGlass, SECOND: { ...customGlass, dispersionCoeffs: [[486.13, 1.522]] } })).toEqual({
      version: "1.0",
      Custom: {
        FIRST: { type: "tabulated", data: [[587.56, 1.5168]] },
        SECOND: { type: "tabulated", data: [[486.13, 1.522]] },
      },
    });
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

  it("filters analytical catalog entries while preserving tabulated entries", () => {
    const customCatalog: Record<string, CatalogGlassData> = {
      TABULATED: customGlass,
      ANALYTICAL: analyticalGlass,
    };
    const emptyCatalog: Record<string, CatalogGlassData> = {};

    expect(getUserDefinedCustomGlasses(customCatalog)).toEqual({ TABULATED: customGlass });
    expect(getUserDefinedCustomGlasses(emptyCatalog)).toBe(emptyCatalog);
  });
});

describe("isUserDefinedGlassAlreadyExistsError", () => {
  it("detects worker duplicate user-defined glass errors", () => {
    expect(isUserDefinedGlassAlreadyExistsError(new Error("ValueError: User-defined glass already exists: test"))).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isUserDefinedGlassAlreadyExistsError(new Error("KeyError: test"))).toBe(false);
  });

  it("recognizes duplicate messages supplied as strings and rejects unrelated unknown values", () => {
    expect(isUserDefinedGlassAlreadyExistsError("User-defined glass already exists: test")).toBe(true);
    expect(isUserDefinedGlassAlreadyExistsError({ message: "User-defined glass already exists: test" })).toBe(false);
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

  it("updates an edited glass when the label is unchanged and persists after the worker succeeds", async () => {
    const worker = makeWorker({
      updateUserDefinedGlasses: jest.fn().mockResolvedValue({ ORIGINAL: customGlass }),
    });
    const persistInput = jest.fn().mockResolvedValue(undefined);
    const upsertCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: makeSaveInput("ORIGINAL"),
      proxy: worker,
      storeActions: { upsertCustomGlasses, deleteCustomGlasses: jest.fn() },
      persistInput,
    });

    expect(worker.updateUserDefinedGlasses).toHaveBeenCalledWith([makeSaveInput("ORIGINAL")]);
    expect(worker.addUserDefinedGlasses).not.toHaveBeenCalled();
    expect(worker.deleteUserDefinedGlasses).not.toHaveBeenCalled();
    expect(persistInput).toHaveBeenCalledWith(makeSaveInput("ORIGINAL"));
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ ORIGINAL: customGlass });
  });

  it("uses the update path for edit mode without a previous label", async () => {
    const worker = makeWorker({
      updateUserDefinedGlasses: jest.fn().mockResolvedValue({ ADDED: customGlass }),
    });
    const upsertCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "edit",
      previousLabel: undefined,
      input: makeSaveInput(),
      proxy: worker,
      storeActions: { upsertCustomGlasses, deleteCustomGlasses: jest.fn() },
    });

    expect(worker.updateUserDefinedGlasses).toHaveBeenCalledWith([makeSaveInput()]);
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ ADDED: customGlass });
  });

  it("persists a renamed edit before deleting the old worker and persisted labels", async () => {
    const deleteUserDefinedGlasses = jest.fn().mockResolvedValue(undefined);
    const worker = makeWorker({
      addUserDefinedGlasses: jest.fn().mockResolvedValue({ RENAMED: customGlass }),
      deleteUserDefinedGlasses,
    });
    const persistInput = jest.fn().mockResolvedValue(undefined);
    const deletePersisted = jest.fn().mockResolvedValue(undefined);
    const deleteCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: makeSaveInput("RENAMED"),
      proxy: worker,
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses },
      persistInput,
      deletePersisted,
    });

    expect(persistInput).toHaveBeenCalledWith(makeSaveInput("RENAMED"));
    expect(deletePersisted).toHaveBeenCalledWith(["ORIGINAL"]);
    expect(persistInput.mock.invocationCallOrder[0]).toBeLessThan(deleteUserDefinedGlasses.mock.invocationCallOrder[0]);
    expect(deleteUserDefinedGlasses.mock.invocationCallOrder[0]).toBeLessThan(deletePersisted.mock.invocationCallOrder[0]);
    expect(deleteCustomGlasses).toHaveBeenCalledWith(["ORIGINAL"]);
  });

  it("warns with fallback messages for non-Error persistence failures during a rename", async () => {
    const worker = makeWorker({
      addUserDefinedGlasses: jest.fn().mockResolvedValue({ RENAMED: customGlass }),
    });
    const onPersistenceWarning = jest.fn();

    await saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: makeSaveInput("RENAMED"),
      proxy: worker,
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
      persistInput: jest.fn().mockRejectedValue("persist failed"),
      deletePersisted: jest.fn().mockRejectedValue("delete failed"),
      onPersistenceWarning,
    });

    expect(onPersistenceWarning).toHaveBeenNthCalledWith(1, "Failed to persist custom glass.");
    expect(onPersistenceWarning).toHaveBeenNthCalledWith(2, "Failed to delete persisted custom glass.");
  });

  it("persists add input only after the worker add succeeds", async () => {
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({ ADDED: customGlass });
    const persistInput = jest.fn().mockResolvedValue(undefined);
    const upsertCustomGlasses = jest.fn();
    const worker = makeWorker({ addUserDefinedGlasses });

    await saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: {
        name: "ADDED",
        pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
      },
      proxy: worker,
      storeActions: {
        upsertCustomGlasses,
        deleteCustomGlasses: jest.fn(),
      },
      persistInput,
    });

    expect(addUserDefinedGlasses).toHaveBeenCalled();
    expect(worker.deleteUserDefinedGlasses).not.toHaveBeenCalled();
    expect(persistInput.mock.invocationCallOrder[0]).toBeGreaterThan(addUserDefinedGlasses.mock.invocationCallOrder[0]);
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ ADDED: customGlass });
  });

  it("does not warn when optional persistence operations are omitted", async () => {
    const onPersistenceWarning = jest.fn();
    const worker = makeWorker({
      addUserDefinedGlasses: jest.fn().mockResolvedValue({ RENAMED: customGlass }),
    });

    await saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: makeSaveInput("RENAMED"),
      proxy: worker,
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
      onPersistenceWarning,
    });

    expect(onPersistenceWarning).not.toHaveBeenCalled();
    expect(worker.deleteUserDefinedGlasses).toHaveBeenCalledWith(["ORIGINAL"]);
  });

  it("ignores persistence failures when the warning callback is omitted", async () => {
    const worker = makeWorker({
      addUserDefinedGlasses: jest.fn().mockResolvedValue({ RENAMED: customGlass }),
    });

    await expect(saveCustomGlass({
      mode: "edit",
      previousLabel: "ORIGINAL",
      input: makeSaveInput("RENAMED"),
      proxy: worker,
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
      persistInput: jest.fn().mockRejectedValue(new Error("persist failed")),
      deletePersisted: jest.fn().mockRejectedValue(new Error("delete failed")),
    })).resolves.toBeUndefined();
  });

  it("does not warn when the add persistence callback is omitted", async () => {
    const onPersistenceWarning = jest.fn();

    await saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: makeSaveInput(),
      proxy: makeWorker(),
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
      onPersistenceWarning,
    });

    expect(onPersistenceWarning).not.toHaveBeenCalled();
  });

  it("ignores add persistence failures when the warning callback is omitted", async () => {
    await expect(saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: makeSaveInput(),
      proxy: makeWorker(),
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
      persistInput: jest.fn().mockRejectedValue("persist failed"),
    })).resolves.toBeUndefined();
  });

  it("does not persist add input when the worker add rejects", async () => {
    const addUserDefinedGlasses = jest.fn().mockRejectedValue(new Error("worker failed"));
    const persistInput = jest.fn();

    await expect(saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: {
        name: "ADDED",
        pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
      },
      proxy: {
        addUserDefinedGlasses,
      } as unknown as PyodideWorkerAPI,
      storeActions: {
        upsertCustomGlasses: jest.fn(),
        deleteCustomGlasses: jest.fn(),
      },
      persistInput,
    })).rejects.toThrow("worker failed");

    expect(persistInput).not.toHaveBeenCalled();
  });

  it("warns but keeps store update when persistence fails after worker success", async () => {
    const addUserDefinedGlasses = jest.fn().mockResolvedValue({ ADDED: customGlass });
    const persistInput = jest.fn().mockRejectedValue(new Error("idb failed"));
    const onPersistenceWarning = jest.fn();
    const upsertCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: {
        name: "ADDED",
        pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
      },
      proxy: {
        addUserDefinedGlasses,
      } as unknown as PyodideWorkerAPI,
      storeActions: {
        upsertCustomGlasses,
        deleteCustomGlasses: jest.fn(),
      },
      persistInput,
      onPersistenceWarning,
    });

    expect(onPersistenceWarning).toHaveBeenCalledWith("idb failed");
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ ADDED: customGlass });
  });

  it("does not persist during duplicate-add fallback when no worker mutation succeeds", async () => {
    const addUserDefinedGlasses = jest.fn().mockRejectedValue(new Error("User-defined glass already exists: ADDED"));
    const getUserDefinedGlasses = jest.fn().mockResolvedValue({ ADDED: customGlass });
    const persistInput = jest.fn();
    const upsertCustomGlasses = jest.fn();

    await saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: {
        name: "ADDED",
        pairs: [[587.56, 1.5168], [486.13, 1.522], [546.07, 1.518], [656.27, 1.514]],
      },
      proxy: {
        addUserDefinedGlasses,
        getUserDefinedGlasses,
      } as unknown as PyodideWorkerAPI,
      storeActions: {
        upsertCustomGlasses,
        deleteCustomGlasses: jest.fn(),
      },
      persistInput,
    });

    expect(getUserDefinedGlasses).toHaveBeenCalledWith(["ADDED"]);
    expect(persistInput).not.toHaveBeenCalled();
    expect(upsertCustomGlasses).toHaveBeenCalledWith({ ADDED: customGlass });
  });

  it("does not treat a duplicate error as an edit fallback", async () => {
    const updateUserDefinedGlasses = jest.fn().mockRejectedValue(new Error("User-defined glass already exists: ADDED"));
    const getUserDefinedGlasses = jest.fn();

    await expect(saveCustomGlass({
      mode: "edit",
      previousLabel: undefined,
      input: makeSaveInput(),
      proxy: makeWorker({ updateUserDefinedGlasses, getUserDefinedGlasses }),
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
    })).rejects.toThrow("User-defined glass already exists: ADDED");

    expect(getUserDefinedGlasses).not.toHaveBeenCalled();
  });

  it("uses the default warning for a non-Error add persistence failure", async () => {
    const onPersistenceWarning = jest.fn();

    await saveCustomGlass({
      mode: "add",
      previousLabel: undefined,
      input: makeSaveInput(),
      proxy: makeWorker(),
      storeActions: { upsertCustomGlasses: jest.fn(), deleteCustomGlasses: jest.fn() },
      persistInput: jest.fn().mockRejectedValue("idb failed"),
      onPersistenceWarning,
    });

    expect(onPersistenceWarning).toHaveBeenCalledWith("Failed to persist custom glass.");
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

  it("uses the filename stem after a path separator and supports a filename without an extension", () => {
    expect(parseCustomGlassCsv(
      new File([], "C:\\catalogs\\LF7", { type: "text/csv" }),
      "wl,n\n0.1,1\n0.2,1\n0.3,1\n0.4,1",
    )).toMatchObject({ name: "LF7" });
  });

  it.each([
    ["", "Missing CSV header wl,n."],
    ["not-a-csv", "CSV header must contain exactly two columns: wl,n."],
    ["wl", "CSV header must contain exactly two columns: wl,n."],
    ["wl,n,extra", "CSV header must contain exactly two columns: wl,n."],
    ["Wl,n", "CSV header must contain exactly two columns: wl,n."],
    ["wl,N", "CSV header must contain exactly two columns: wl,n."],
  ])("rejects invalid CSV header text %p", (text, reason) => {
    expect(parseCustomGlassCsv(new File([], "LF7.csv"), text)).toEqual({ filename: "LF7.csv", reason });
  });

  it("rejects a file whose name cannot supply a glass label", () => {
    expect(parseCustomGlassCsv(
      new File([], ""),
      "wl,n\n0.1,1\n0.2,1\n0.3,1\n0.4,1",
    )).toEqual({ filename: "", reason: "Filename must provide a non-blank glass label." });
  });

  it.each([
    ["0.1", "Row 2 must contain exactly two columns."],
    ["0.1,1,extra", "Row 2 must contain exactly two columns."],
    [",1", "Row 2 must contain exactly two columns."],
    ["   ,1", "Row 2 must contain exactly two columns."],
    ["0.1,not-a-number", "Row 2 values must be numeric."],
    ["NaN,1", "Row 2 values must be numeric."],
    ["0,1", "Row 2 values must be positive."],
    ["0.1,0", "Row 2 values must be positive."],
    ["-0.1,1", "Row 2 values must be positive."],
    ["0.1,-1", "Row 2 values must be positive."],
  ])("rejects invalid CSV row %p", (row, reason) => {
    expect(parseCustomGlassCsv(
      new File([], "LF7.csv"),
      `wl,n\n${row}\n0.2,1\n0.3,1\n0.4,1`,
    )).toEqual({ filename: "LF7.csv", reason });
  });

  it("rejects duplicate wavelengths and files with fewer than four pairs", () => {
    expect(parseCustomGlassCsv(
      new File([], "LF7.csv"),
      "wl,n\n0.1,1\n0.1,1.1\n0.2,1\n0.3,1",
    )).toEqual({ filename: "LF7.csv", reason: "Duplicate wavelength 0.1 found." });
    expect(parseCustomGlassCsv(
      new File([], "LF7.csv"),
      "wl,n\n0.1,1\n0.2,1\n0.3,1",
    )).toEqual({ filename: "LF7.csv", reason: "CSV must contain at least four valid wavelength/index pairs." });
  });

  it("ignores blank lines and trims CSV values while preserving row order", () => {
    expect(parseCustomGlassCsv(
      new File([], "LF7.csv"),
      " wl , n \r\n 0.1 , 1 \r\n \t \r\n\r\n 0.2 , 1.1 \r\n 0.3 , 1.2 \r\n 0.4 , 1.3 \r\n",
    )).toEqual({
      name: "LF7",
      pairs: [[100, 1], [200, 1.1], [300, 1.2], [400, 1.3]],
    });

    expect(parseCustomGlassCsv(
      new File([], "  LF7 .csv "),
      "wl,n\n0.1,1\n0.2,1.1\n0.3,1.2\n0.4,1.3",
    )).toMatchObject({ name: "LF7" });
    expect(parseCustomGlassCsv(
      new File([], ".csv"),
      "wl,n\n0.1,1\n0.2,1.1\n0.3,1.2\n0.4,1.3",
    )).toMatchObject({ name: ".csv" });
  });
});

describe("downloadCustomGlassJson", () => {
  it("creates, downloads, and revokes a formatted JSON blob", async () => {
    const { downloadCustomGlassJson } = await import("@/features/import-custom-glass/lib/customGlassImport");
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = jest.fn().mockReturnValue("blob:custom-glass");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const anchor = document.createElement("a");
    const click = jest.spyOn(anchor, "click").mockImplementation(() => undefined);
    const createElement = jest.spyOn(document, "createElement").mockReturnValue(anchor);

    try {
      downloadCustomGlassJson({
        version: "1.0",
        Custom: { LF7: { type: "tabulated", data: [[486.13, 1.522]] } },
      });

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe("application/json");
      const blobText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });
      expect(blobText).toBe(JSON.stringify({
          version: "1.0",
          Custom: { LF7: { type: "tabulated", data: [[486.13, 1.522]] } },
        }, undefined, 2));
      expect(createElement).toHaveBeenCalledWith("a");
      expect(anchor.href).toBe("blob:custom-glass");
      expect(anchor.download).toBe("custom-glass.json");
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:custom-glass");
    } finally {
      createElement.mockRestore();
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL });
      click.mockRestore();
    }
  });
});
