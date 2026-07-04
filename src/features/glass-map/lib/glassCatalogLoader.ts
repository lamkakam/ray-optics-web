"use client";

import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import { completeAllCatalogsData } from "@/features/glass-map/lib/glassMap";
import type { CompleteGlassCatalogsData } from "@/features/glass-map/types/glassMap";

export type GlassCatalogsLoadResult =
  | { readonly data: CompleteGlassCatalogsData; readonly error: undefined }
  | { readonly data: undefined; readonly error: string };

let inFlightLoads = new WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load glass data";
}

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

export function _resetGlassCatalogLoaderForTest(): void {
  inFlightLoads = new WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>();
}
