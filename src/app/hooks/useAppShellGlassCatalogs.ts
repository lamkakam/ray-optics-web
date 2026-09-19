"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import type { GlassCatalogContextValue } from "@/shared/components/providers/GlassCatalogProvider";
import { useGlassMapStore } from "@/features/glass-map/providers/GlassMapStoreProvider";
import { loadGlassCatalogs } from "@/features/glass-map/lib/glassCatalogLoader";
import {
  isPersistedCustomGlassRow,
  quarantinePersistedCustomGlass,
  quarantineStoredCustomGlassRow,
  readStoredCustomGlassRows,
} from "@/features/import-custom-glass/lib/customGlassStorage";
import type {
  CompleteGlassCatalogsData,
  UserDefinedMaterialsData,
} from "@/features/glass-map/types/glassMap";

/**
 * Replays persisted custom glasses into the worker one row at a time, merging
 * accepted rows into a copy of Custom without changing loader-owned data.
 * Invalid/unsupported rows and worker rejections are quarantined when possible;
 * warning labels retain row order and use "unlabeled" when no label is available.
 * Storage read/quarantine failures do not prevent built-in catalogs from loading.
 */
async function hydratePersistedCustomGlasses(
  proxy: PyodideWorkerAPI,
  data: CompleteGlassCatalogsData,
) {
  const hydratedData: CompleteGlassCatalogsData = {
    ...data,
    Custom: { ...data.Custom },
  };
  const quarantinedLabels: string[] = [];
  const storedRows = await readStoredCustomGlassRows().catch(() => []);
  for (const row of storedRows) {
    if (!isPersistedCustomGlassRow(row)) {
      const label =
        typeof row === "object" &&
        row !== null &&
        "label" in row &&
        typeof row.label === "string"
          ? row.label
          : "unlabeled";
      quarantinedLabels.push(label);
      await quarantineStoredCustomGlassRow(row, label).catch(() => undefined);
      continue;
    }

    try {
      const added: UserDefinedMaterialsData = await proxy.addUserDefinedGlasses(
        [
          {
            name: row.label,
            pairs: row.pairs,
          },
        ],
      );
      hydratedData.Custom = {
        ...hydratedData.Custom,
        ...added,
      };
    } catch {
      quarantinedLabels.push(row.label);
      await quarantinePersistedCustomGlass(row).catch(() => undefined);
    }
  }

  return { hydratedData, quarantinedLabels };
}

/** Shell-local initial catalog preload lifecycle. */
type GlassCatalogPreloadStatus = "loading" | "loaded" | "error";

/**
 * Owns preload status/errors while GlassMapStore owns successful data and lookup
 * maps. Automatic startup waits for a ready runtime and proxy, reuses store data,
 * and otherwise loads catalogs then hydrates persisted glasses before committing.
 * A load response received after effect cleanup is ignored before hydration.
 * Startup failures remain local and block initialization; quarantined labels are
 * exposed for one dismissible shell warning after hydration finishes.
 *
 * Manual preload intentionally needs only a proxy: it returns current store data
 * or loads and commits catalogs without persisted-glass hydration. Both paths
 * retain successful status independently of whether store data remains available.
 */
export function useAppShellGlassCatalogs(
  isReady: boolean,
  proxy: PyodideWorkerAPI | undefined,
) {
  const glassMapStore = useGlassMapStore();
  const catalogsData = useStore(glassMapStore, (state) => state.catalogsData);
  const lookupMaps = useStore(glassMapStore, (state) => state.lookupMaps);
  /** Initial catalog preload lifecycle after Pyodide becomes ready. */
  const [glassCatalogPreloadStatus, setGlassCatalogPreloadStatus] = useState<
    GlassCatalogPreloadStatus | undefined
  >();
  /** Blocking catalog preload error displayed by the initialization overlay. */
  const [glassCatalogPreloadError, setGlassCatalogPreloadError] = useState<
    string | undefined
  >();
  /** Persisted custom-glass labels quarantined during startup hydration. */
  const [quarantinedCustomGlassLabels, setQuarantinedCustomGlassLabels] =
    useState<readonly string[]>([]);
  /** Whether catalog preload must keep the blocking overlay visible. */
  const glassCatalogsLoading =
    isReady &&
    proxy !== undefined &&
    catalogsData === undefined &&
    glassCatalogPreloadStatus !== "loaded" &&
    glassCatalogPreloadStatus !== "error";
  /** Whether catalogs are available from the store or completed initial preload. */
  const glassCatalogsLoaded =
    catalogsData !== undefined || glassCatalogPreloadStatus === "loaded";

  useEffect(() => {
    if (!isReady || proxy === undefined) {
      return;
    }

    if (catalogsData !== undefined) {
      return;
    }

    if (glassCatalogPreloadStatus !== undefined) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await loadGlassCatalogs(proxy);
      if (cancelled) {
        return;
      }

      if (result.error === undefined) {
        const { hydratedData, quarantinedLabels } =
          await hydratePersistedCustomGlasses(proxy, result.data);

        if (quarantinedLabels.length > 0) {
          setQuarantinedCustomGlassLabels(quarantinedLabels);
        }
        glassMapStore.getState().setCatalogsData(hydratedData);
        setGlassCatalogPreloadStatus("loaded");
        setGlassCatalogPreloadError(undefined);
        return;
      }

      setGlassCatalogPreloadStatus("error");
      setGlassCatalogPreloadError(result.error);
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogsData, glassCatalogPreloadStatus, glassMapStore, isReady, proxy]);

  /** Stable catalog context combining store data with shell-local preload state. */
  const glassCatalogContextValue = useMemo<GlassCatalogContextValue>(
    () => ({
      catalogs: catalogsData,
      lookupMaps,
      error: glassCatalogPreloadError,
      isLoaded: glassCatalogsLoaded,
      isLoading: glassCatalogsLoading,
      preload: async () => {
        if (proxy === undefined) {
          return undefined;
        }

        if (catalogsData !== undefined) {
          setGlassCatalogPreloadStatus("loaded");
          setGlassCatalogPreloadError(undefined);
          return { data: catalogsData, error: undefined };
        }

        setGlassCatalogPreloadStatus("loading");
        setGlassCatalogPreloadError(undefined);
        const result = await loadGlassCatalogs(proxy);
        if (result.error === undefined) {
          glassMapStore.getState().setCatalogsData(result.data);
          setGlassCatalogPreloadStatus("loaded");
          setGlassCatalogPreloadError(undefined);
        } else {
          setGlassCatalogPreloadStatus("error");
          setGlassCatalogPreloadError(result.error);
        }
        return result;
      },
    }),
    [
      catalogsData,
      glassCatalogPreloadError,
      glassCatalogsLoaded,
      glassCatalogsLoading,
      glassMapStore,
      lookupMaps,
      proxy,
    ],
  );

  /** Dismisses the startup warning without changing hydrated catalog data. */
  const dismissQuarantineWarning = useCallback(() => {
    setQuarantinedCustomGlassLabels([]);
  }, []);

  return {
    glassCatalogContextValue,
    quarantinedCustomGlassLabels,
    dismissQuarantineWarning,
  };
}
