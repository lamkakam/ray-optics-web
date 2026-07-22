"use client";
/**
 * Deduplicates concurrent catalog loads per worker proxy without retaining settled
 * data or errors; durable catalog ownership remains in `GlassMapStore`.
 */

import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { completeAllCatalogsData } from "@/features/glass-map/lib/glassMap";
import type { CompleteGlassCatalogsData } from "@/features/glass-map/types/glassMap";

/** Successful complete catalog data or a normalized worker error message. */
export type GlassCatalogsLoadResult =
  | { readonly data: CompleteGlassCatalogsData; readonly error: undefined }
  | { readonly data: undefined; readonly error: string };

let inFlightLoads = new WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load glass data";
}

/**
 * Loads complete catalogs, sharing an in-flight promise for concurrent callers using
 * the same proxy. Failures resolve as data/error results and settled entries are removed.
 */
export function loadGlassCatalogs(proxy: PyodideWorkerAPI): Promise<GlassCatalogsLoadResult> {
  const inFlightLoad = inFlightLoads.get(proxy);

  if (inFlightLoad !== undefined) {
    return inFlightLoad;
  }

  const loadPromise = proxy
    .getAllGlassCatalogsData()
    .then(
      (rawData): GlassCatalogsLoadResult => ({
        data: completeAllCatalogsData(rawData),
        error: undefined,
      }),
    )
    .catch(
      (error: unknown): GlassCatalogsLoadResult => ({
        data: undefined,
        error: getErrorMessage(error),
      }),
    )
    .finally(() => {
      inFlightLoads.delete(proxy);
    });

  inFlightLoads.set(proxy, loadPromise);
  return loadPromise;
}

/** Clears in-flight requests for test isolation. */
export function _resetGlassCatalogLoaderForTest(): void {
  inFlightLoads = new WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>();
}
