/**
# `features/glass-map/lib/glassCatalogLoader.ts`

## Purpose
Client-side Pyodide worker loader for frontend-ready glass catalog data.

The loader only deduplicates concurrent worker requests. It does not retain completed catalog data or settled errors. Mutable catalog state belongs to `GlassMapStore.catalogsData` after a successful load.

## Behaviour
- Uses a module-level `WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>`
- Provides no `peek` or Suspense `read` API because settled mutable data is intentionally not cached here
- Leaves lookup-map derivation and durable catalog ownership to `features/glass-map/stores/glassMapStore`*/
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

/**
### `loadGlassCatalogs(proxy)`
```ts
loadGlassCatalogs(proxy: PyodideWorkerAPI): Promise<GlassCatalogsLoadResult>
```

- Starts `proxy.getAllGlassCatalogsData()` when no request is already in flight for that proxy
- Reuses the same promise for concurrent callers using the same worker proxy
- Completes worker payload catalog keys with `completeAllCatalogsData()`
- Resolves worker failures as `{ data: undefined, error: string }`
- Deletes the in-flight entry after success or failure so later calls start a new worker request
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

/**
### `_resetGlassCatalogLoaderForTest()`
```ts
_resetGlassCatalogLoaderForTest(): void
```

- Clears in-flight requests for Jest isolation
*/
export function _resetGlassCatalogLoaderForTest(): void {
  inFlightLoads = new WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>();
}
