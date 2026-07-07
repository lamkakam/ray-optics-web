# `features/glass-map/lib/glassCatalogLoader.ts`

## Purpose
Client-side Pyodide worker loader for frontend-ready glass catalog data.

The loader only deduplicates concurrent worker requests. It does not retain completed catalog data or settled errors. Mutable catalog state belongs to `GlassMapStore.catalogsData` after a successful load.

## Exports

### `loadGlassCatalogs(proxy)`
```ts
loadGlassCatalogs(proxy: PyodideWorkerAPI): Promise<GlassCatalogsLoadResult>
```

- Starts `proxy.getAllGlassCatalogsData()` when no request is already in flight for that proxy
- Reuses the same promise for concurrent callers using the same worker proxy
- Completes worker payload catalog keys with `completeAllCatalogsData()`
- Resolves worker failures as `{ data: undefined, error: string }`
- Deletes the in-flight entry after success or failure so later calls start a new worker request

### `_resetGlassCatalogLoaderForTest()`
```ts
_resetGlassCatalogLoaderForTest(): void
```

- Clears in-flight requests for Jest isolation

## Behaviour
- Uses a module-level `WeakMap<PyodideWorkerAPI, Promise<GlassCatalogsLoadResult>>`
- Provides no `peek` or Suspense `read` API because settled mutable data is intentionally not cached here
- Leaves lookup-map derivation and durable catalog ownership to `features/glass-map/stores/glassMapStore`
