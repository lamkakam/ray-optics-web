/** Verifies startup preserves saved glasses on runtime failures, quarantines invalid data, ignores late hydration, and retains manual preload behavior. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import { useAppShellGlassCatalogs } from "@/app/hooks/useAppShellGlassCatalogs";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  CALCULATION_FAILED_MESSAGE,
  INITIALIZATION_FAILED_MESSAGE,
  DUPLICATE_GLASS_MESSAGE,
  withPyodideErrorHandling,
} from "@/shared/lib/pyodideErrors";
import { createGlassMapSlice } from "@/features/glass-map/stores/glassMapStore";
import { completeAllCatalogsData } from "@/features/glass-map/lib/glassMap";
import type {
  AllGlassCatalogsData,
  UserDefinedGlassData,
  UserDefinedMaterialsData,
} from "@/features/glass-map/types/glassMap";
import {
  readStoredCustomGlassRows,
  quarantinePersistedCustomGlass,
  quarantineStoredCustomGlassRow,
} from "@/features/import-custom-glass/lib/customGlassStorage";

let mockGlassMapStore = createStore(createGlassMapSlice);
jest.mock("@/features/glass-map/providers/GlassMapStoreProvider", () => ({
  useGlassMapStore: () => mockGlassMapStore,
}));
jest.mock("@/features/import-custom-glass/lib/customGlassStorage", () => ({
  ...jest.requireActual(
    "@/features/import-custom-glass/lib/customGlassStorage",
  ),
  readStoredCustomGlassRows: jest.fn(),
  quarantinePersistedCustomGlass: jest.fn(),
  quarantineStoredCustomGlassRow: jest.fn(),
}));

const pairs = [
  [587.56, 1.7],
  [486.13, 1.71],
  [546.07, 1.705],
  [656.27, 1.695],
] as const;
const glass: UserDefinedGlassData = {
  refractiveIndexD: 1.7,
  refractiveIndexE: 1.705,
  abbeNumberD: 46.6,
  abbeNumberE: 47,
  partialDispersions: { P_gF: 0.5, P_Fd: 0.4, P_fe: 0.4 },
  dispersionCoeffKind: "tabulated",
  dispersionCoeffs: pairs,
};
const catalogs = completeAllCatalogsData({ Custom: { BUILT_IN: glass } });
const persisted = { label: "PERSISTED", type: "tabulated", pairs } as const;
const getAllGlassCatalogsData = jest.fn<Promise<AllGlassCatalogsData>, []>();
const addUserDefinedGlasses = jest.fn<
  ReturnType<PyodideWorkerAPI["addUserDefinedGlasses"]>,
  Parameters<PyodideWorkerAPI["addUserDefinedGlasses"]>
>();
let proxy: PyodideWorkerAPI;
const readRows = jest.mocked(readStoredCustomGlassRows);
const quarantineValid = jest.mocked(quarantinePersistedCustomGlass);
const quarantineInvalid = jest.mocked(quarantineStoredCustomGlassRow);

describe("useAppShellGlassCatalogs", () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    error = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGlassMapStore = createStore(createGlassMapSlice);
    getAllGlassCatalogsData.mockReset().mockResolvedValue(catalogs);
    addUserDefinedGlasses.mockReset().mockResolvedValue({ PERSISTED: glass });
    proxy = {
      getAllGlassCatalogsData,
      addUserDefinedGlasses,
    } as unknown as PyodideWorkerAPI;
    readRows.mockReset().mockResolvedValue([]);
    quarantineValid.mockReset().mockResolvedValue(undefined);
    quarantineInvalid.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("waits for both runtime readiness and a proxy before loading", async () => {
    const { result, rerender } = renderHook(
      ({
        isReady,
        worker,
      }: {
        readonly isReady: boolean;
        readonly worker: PyodideWorkerAPI | undefined;
      }) => useAppShellGlassCatalogs(isReady, worker),
      {
        initialProps: {
          isReady: false,
          worker: undefined as PyodideWorkerAPI | undefined,
        },
      },
    );
    expect(result.current.glassCatalogContextValue.isLoading).toBe(false);
    rerender({ isReady: true, worker: undefined });
    rerender({ isReady: false, worker: proxy });
    expect(getAllGlassCatalogsData).not.toHaveBeenCalled();
    rerender({ isReady: true, worker: proxy });
    expect(result.current.glassCatalogContextValue.isLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(true),
    );
    expect(getAllGlassCatalogsData).toHaveBeenCalledTimes(1);
    expect(result.current.glassCatalogContextValue.isLoading).toBe(false);
    expect(result.current.glassCatalogContextValue.catalogs).toBe(
      mockGlassMapStore.getState().catalogsData,
    );
    expect(result.current.glassCatalogContextValue.lookupMaps).toBe(
      mockGlassMapStore.getState().lookupMaps,
    );
  });

  it("keeps startup pending until persisted rows hydrate and merges them with built-in Custom data", async () => {
    readRows.mockResolvedValue([persisted, { ...persisted, label: "SECOND" }]);
    let finish!: (data: UserDefinedMaterialsData) => void;
    addUserDefinedGlasses
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce({ SECOND: glass });
    const { result } = renderHook(() => useAppShellGlassCatalogs(true, proxy));
    await waitFor(() => expect(addUserDefinedGlasses).toHaveBeenCalledTimes(1));
    expect(addUserDefinedGlasses).toHaveBeenNthCalledWith(1, [
      { name: persisted.label, pairs },
    ]);
    expect(result.current.glassCatalogContextValue.isLoading).toBe(true);
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
    expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
    await act(async () => {
      finish({ PERSISTED: glass });
    });
    await waitFor(() =>
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(true),
    );
    expect(addUserDefinedGlasses).toHaveBeenNthCalledWith(2, [
      { name: "SECOND", pairs },
    ]);
    expect(mockGlassMapStore.getState().catalogsData?.Custom).toEqual({
      BUILT_IN: glass,
      PERSISTED: glass,
      SECOND: glass,
    });
    expect(catalogs.Custom).toEqual({ BUILT_IN: glass });
  });

  it("quarantines invalid rows and normalized business rejections in order while retaining accepted rows and allowing dismissal", async () => {
    const invalid = { label: "BAD_TYPE", type: "sellmeier", pairs: [] };
    const rejected = { ...persisted, label: "REJECTED" };
    readRows.mockResolvedValue([invalid, persisted, rejected, {}]);
    addUserDefinedGlasses
      .mockResolvedValueOnce({ PERSISTED: glass })
      .mockRejectedValueOnce(
        Object.assign(new Error(DUPLICATE_GLASS_MESSAGE), {
          name: "PyodideBusinessError",
        }),
      );
    quarantineValid.mockRejectedValue(new Error("Storage unavailable"));
    quarantineInvalid.mockRejectedValue(new Error("Storage unavailable"));
    const { result } = renderHook(() => useAppShellGlassCatalogs(true, proxy));
    await waitFor(() =>
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(true),
    );
    expect(result.current.quarantinedCustomGlassLabels).toEqual([
      "BAD_TYPE",
      "REJECTED",
      "unlabeled",
    ]);
    expect(quarantineInvalid).toHaveBeenCalledWith(invalid, "BAD_TYPE");
    expect(quarantineInvalid).toHaveBeenCalledWith({}, "unlabeled");
    expect(quarantineValid).toHaveBeenCalledWith(rejected);
    expect(mockGlassMapStore.getState().catalogsData?.Custom).toEqual({
      BUILT_IN: glass,
      PERSISTED: glass,
    });
    expect(result.current.glassCatalogContextValue.error).toBeUndefined();
    act(() => {
      result.current.dismissQuarantineWarning();
    });
    expect(result.current.quarantinedCustomGlassLabels).toEqual([]);
    expect(mockGlassMapStore.getState().catalogsData?.Custom.PERSISTED).toEqual(
      glass,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it.each(["error", "messageerror"])(
    "preserves saved glasses and blocks startup when the worker emits %s during hydration",
    async (type) => {
      readRows.mockResolvedValue([
        persisted,
        { ...persisted, label: "SECOND" },
      ]);
      addUserDefinedGlasses.mockReturnValue(new Promise(() => {}));
      const endpoint = new EventTarget();
      const worker = withPyodideErrorHandling(
        { ...proxy, init: async () => {} },
        endpoint,
      );
      await worker.init();
      const { result } = renderHook(() =>
        useAppShellGlassCatalogs(true, worker),
      );
      await waitFor(() =>
        expect(addUserDefinedGlasses).toHaveBeenCalledTimes(1),
      );

      await act(async () => {
        endpoint.dispatchEvent(new Event(type));
      });

      expect(quarantineValid).not.toHaveBeenCalled();
      expect(quarantineInvalid).not.toHaveBeenCalled();
      expect(addUserDefinedGlasses).toHaveBeenCalledTimes(1);
      expect(addUserDefinedGlasses).toHaveBeenCalledWith([
        { name: persisted.label, pairs },
      ]);
      expect(result.current.glassCatalogContextValue.error).toBe(
        CALCULATION_FAILED_MESSAGE,
      );
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
      expect(result.current.glassCatalogContextValue.isLoading).toBe(false);
      expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
      expect(result.current.quarantinedCustomGlassLabels).toEqual([]);
      expect(error).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      Object.assign(new Error(CALCULATION_FAILED_MESSAGE), {
        name: "PyodideFatalError",
      }),
      CALCULATION_FAILED_MESSAGE,
    ],
    [
      Object.assign(new Error(INITIALIZATION_FAILED_MESSAGE), {
        name: "PyodideFatalError",
      }),
      INITIALIZATION_FAILED_MESSAGE,
    ],
    [new Error("Private worker failure"), CALCULATION_FAILED_MESSAGE],
    [undefined, CALCULATION_FAILED_MESSAGE],
    [
      Object.assign(new Error("Unapproved message"), {
        name: "PyodideBusinessError",
      }),
      CALCULATION_FAILED_MESSAGE,
    ],
    [new Error(DUPLICATE_GLASS_MESSAGE), DUPLICATE_GLASS_MESSAGE],
  ])(
    "preserves saved glasses and stops hydration on a fatal or unclassified rejection: %p",
    async (failure, message) => {
      readRows.mockResolvedValue([
        persisted,
        { ...persisted, label: "SECOND" },
      ]);
      addUserDefinedGlasses.mockRejectedValueOnce(failure);
      const { result } = renderHook(() =>
        useAppShellGlassCatalogs(true, proxy),
      );
      await waitFor(() =>
        expect(result.current.glassCatalogContextValue.isLoading).toBe(false),
      );

      expect(quarantineValid).not.toHaveBeenCalled();
      expect(quarantineInvalid).not.toHaveBeenCalled();
      expect(addUserDefinedGlasses).toHaveBeenCalledTimes(1);
      expect(result.current.glassCatalogContextValue.error).toBe(message);
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
      expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
      expect(result.current.quarantinedCustomGlassLabels).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    },
  );

  it("allows startup to complete when persisted storage cannot be read", async () => {
    readRows.mockRejectedValue(new Error("Storage unavailable"));
    const { result } = renderHook(() => useAppShellGlassCatalogs(true, proxy));
    await waitFor(() =>
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(true),
    );
    expect(mockGlassMapStore.getState().catalogsData).toEqual(catalogs);
    expect(result.current.quarantinedCustomGlassLabels).toEqual([]);
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();
  });

  it("uses current store data for cached preload and retains loaded status if data is subsequently cleared", async () => {
    mockGlassMapStore.getState().setCatalogsData(catalogs);
    const { result } = renderHook(() => useAppShellGlassCatalogs(true, proxy));
    act(() => {
      mockGlassMapStore.getState().upsertCustomGlasses({ EDITED: glass });
    });
    const stored = mockGlassMapStore.getState().catalogsData;
    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.glassCatalogContextValue.preload();
    });
    expect(loaded).toEqual({ data: stored, error: undefined });
    expect(result.current.glassCatalogContextValue.catalogs).toBe(stored);
    expect(result.current.glassCatalogContextValue.lookupMaps).toBe(
      mockGlassMapStore.getState().lookupMaps,
    );
    act(() => {
      mockGlassMapStore.setState({
        catalogsData: undefined,
        lookupMaps: undefined,
      });
    });
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(true);
    expect(result.current.glassCatalogContextValue.isLoading).toBe(false);
    expect(getAllGlassCatalogsData).not.toHaveBeenCalled();
    expect(readRows).not.toHaveBeenCalled();
  });

  it("returns undefined from manual preload without a proxy", async () => {
    const { result } = renderHook(() =>
      useAppShellGlassCatalogs(false, undefined),
    );
    await expect(
      result.current.glassCatalogContextValue.preload(),
    ).resolves.toBeUndefined();
    expect(getAllGlassCatalogsData).not.toHaveBeenCalled();
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
  });

  it("manually preloads with an available proxy before readiness without replaying persisted glasses", async () => {
    readRows.mockResolvedValue([persisted]);
    const { result } = renderHook(() => useAppShellGlassCatalogs(false, proxy));
    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.glassCatalogContextValue.preload();
    });
    expect(loaded).toEqual({ data: catalogs, error: undefined });
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(true);
    expect(mockGlassMapStore.getState().catalogsData).toEqual(catalogs);
    expect(readRows).not.toHaveBeenCalled();
    expect(addUserDefinedGlasses).not.toHaveBeenCalled();
  });

  it("retains automatic failures locally and permits a manual retry without hydration", async () => {
    getAllGlassCatalogsData.mockRejectedValueOnce(
      new Error("Catalog preload failed"),
    );
    const { result } = renderHook(() => useAppShellGlassCatalogs(true, proxy));
    await waitFor(() =>
      expect(result.current.glassCatalogContextValue.error).toBe(
        "The calculation could not be completed. Please try again.",
      ),
    );
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
    expect(result.current.glassCatalogContextValue.isLoading).toBe(false);
    expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
    await act(async () => {
      await result.current.glassCatalogContextValue.preload();
    });
    expect(result.current.glassCatalogContextValue.error).toBeUndefined();
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(true);
    expect(mockGlassMapStore.getState().catalogsData).toEqual(catalogs);
    expect(getAllGlassCatalogsData).toHaveBeenCalledTimes(2);
    expect(readRows).not.toHaveBeenCalled();
  });

  it("reports a failed manual preload without committing data", async () => {
    getAllGlassCatalogsData.mockRejectedValue(
      new Error("Manual preload failed"),
    );
    const { result } = renderHook(() => useAppShellGlassCatalogs(false, proxy));
    let loaded: unknown;
    await act(async () => {
      loaded = await result.current.glassCatalogContextValue.preload();
    });
    expect(loaded).toEqual({
      data: undefined,
      error: "The calculation could not be completed. Please try again.",
    });
    expect(result.current.glassCatalogContextValue.error).toBe(
      "The calculation could not be completed. Please try again.",
    );
    expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
    expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
  });

  it("does not hydrate or commit a catalog response received after unmount", async () => {
    let finish!: (data: AllGlassCatalogsData) => void;
    getAllGlassCatalogsData.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { unmount } = renderHook(() => useAppShellGlassCatalogs(true, proxy));
    unmount();
    await act(async () => {
      finish(catalogs);
    });
    expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
    expect(readRows).not.toHaveBeenCalled();
  });

  it.each(["completion", "business rejection", "fatal rejection"])(
    "ignores hydration %s after effect cleanup",
    async (outcome) => {
      readRows.mockResolvedValue([persisted]);
      let finish!: (data: UserDefinedMaterialsData) => void;
      let fail!: (reason: Error) => void;
      addUserDefinedGlasses.mockReturnValueOnce(
        new Promise((resolve, reject) => {
          finish = resolve;
          fail = reject;
        }),
      );
      const { result, rerender } = renderHook(
        ({ isReady }) => useAppShellGlassCatalogs(isReady, proxy),
        { initialProps: { isReady: true } },
      );
      await waitFor(() =>
        expect(addUserDefinedGlasses).toHaveBeenCalledTimes(1),
      );
      rerender({ isReady: false });

      await act(async () => {
        if (outcome === "completion") {
          finish({ PERSISTED: glass });
        } else if (outcome === "business rejection") {
          fail(
            Object.assign(new Error(DUPLICATE_GLASS_MESSAGE), {
              name: "PyodideBusinessError",
            }),
          );
        } else {
          fail(
            Object.assign(new Error(CALCULATION_FAILED_MESSAGE), {
              name: "PyodideFatalError",
            }),
          );
        }
      });

      expect(mockGlassMapStore.getState().catalogsData).toBeUndefined();
      expect(result.current.glassCatalogContextValue.isLoaded).toBe(false);
      expect(result.current.glassCatalogContextValue.error).toBeUndefined();
      expect(result.current.quarantinedCustomGlassLabels).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    },
  );
});
