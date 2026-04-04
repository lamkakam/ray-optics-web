"use client";

import type { PyodideWorkerAPI } from "@/shared/hooks/usePyodide";
import {
  normalizeAllCatalogsData,
  type AllGlassCatalogsData,
} from "@/shared/lib/types/glassMap";

export type GlassCatalogsLoadResult =
  | { readonly data: AllGlassCatalogsData; readonly error: undefined }
  | { readonly data: undefined; readonly error: string };

interface GlassCatalogsResourceEntry {
  promise: Promise<GlassCatalogsLoadResult>;
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
        const result: GlassCatalogsLoadResult = {
          data: normalizeAllCatalogsData(rawData),
          error: undefined,
        };
        entry.result = result;
        return result;
      })
      .catch((error: unknown) => {
        const result: GlassCatalogsLoadResult = {
          data: undefined,
          error: getErrorMessage(error),
        };
        entry.result = result;
        return result;
      }),
  };

  return entry;
}

function getOrCreateEntry(proxy: PyodideWorkerAPI): GlassCatalogsResourceEntry {
  let entry = resourceCache.get(proxy);

  if (entry === undefined) {
    entry = createEntry(proxy);
    resourceCache.set(proxy, entry);
  }

  return entry;
}

export function preloadGlassCatalogs(proxy: PyodideWorkerAPI): Promise<GlassCatalogsLoadResult> {
  return getOrCreateEntry(proxy).promise;
}

export function peekGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult | undefined {
  return resourceCache.get(proxy)?.result;
}

export function readGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult {
  const entry = getOrCreateEntry(proxy);

  if (entry.result === undefined) {
    throw entry.promise;
  }

  return entry.result;
}

export function _resetGlassCatalogsResourceForTest(): void {
  resourceCache = new WeakMap<PyodideWorkerAPI, GlassCatalogsResourceEntry>();
}
