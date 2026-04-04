"use client";

import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  normalizeAllCatalogsData,
  type AllGlassCatalogsData,
} from "@/shared/lib/types/glassMap";

type GlassCatalogsLoadResult =
  | { readonly data: AllGlassCatalogsData; readonly error: undefined }
  | { readonly data: undefined; readonly error: string };

interface GlassCatalogsResourceEntry {
  promise: Promise<void>;
  result?: GlassCatalogsLoadResult;
}

let resourceCache = new WeakMap<PyodideWorkerAPI, GlassCatalogsResourceEntry>();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load glass data";
}

function createEntry(proxy: PyodideWorkerAPI): GlassCatalogsResourceEntry {
  const entry: GlassCatalogsResourceEntry = {
    promise: proxy
      .getAllGlassCatalogsData()
      .then((rawData) => {
        entry.result = {
          data: normalizeAllCatalogsData(rawData),
          error: undefined,
        };
      })
      .catch((error: unknown) => {
        entry.result = {
          data: undefined,
          error: getErrorMessage(error),
        };
      }),
  };

  return entry;
}

export function readGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult {
  let entry = resourceCache.get(proxy);

  if (entry === undefined) {
    entry = createEntry(proxy);
    resourceCache.set(proxy, entry);
  }

  if (entry.result === undefined) {
    throw entry.promise;
  }

  return entry.result;
}

export function _resetGlassCatalogsResourceForTest(): void {
  resourceCache = new WeakMap<PyodideWorkerAPI, GlassCatalogsResourceEntry>();
}
