# `features/glass-map/lib/glassCatalogsResource.ts`

## Purpose
Glass-map client-side loader for frontend-ready glass catalog data fetched from the Pyodide worker. It supports both eager preloading and Suspense reads while deduplicating requests per worker proxy.

## Exports

### `preloadGlassCatalogs(proxy)`
```ts
preloadGlassCatalogs(proxy: PyodideWorkerAPI): Promise<GlassCatalogsLoadResult>
```

- Starts the worker fetch on first call for a given proxy
- Reuses the same in-flight or completed request for later callers
- Resolves with completed catalog data or an error result

### `peekGlassCatalogs(proxy)`
```ts
peekGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult | undefined
```

- Returns the settled cached result for the proxy, if available
- Does not start loading

### `readGlassCatalogs(proxy)`
```ts
readGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult
```

- Starts loading on first read if needed
- Throws the pending promise while loading so a `Suspense` boundary can render a fallback
- Returns the settled result once available

### `_resetGlassCatalogsResourceForTest()`
```ts
_resetGlassCatalogsResourceForTest(): void
```

- Clears the module cache for Jest isolation

## Behaviour
- Uses a module-level `WeakMap<PyodideWorkerAPI, GlassCatalogsResourceEntry>` for dedupe
- Completes worker payload catalog keys with `completeAllCatalogsData()` from `features/glass-map/lib/glassMap`
- Leaves lookup-map derivation to `features/glass-map/stores/glassMapStore`
- Represents failure as `{ data: undefined, error: string }` rather than throwing after settlement
