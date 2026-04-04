# `features/glass-map/glassCatalogsResource.ts`

## Purpose
Client-side Suspense resource for loading and normalizing glass catalog data from the Pyodide worker without a component-level `useEffect`.

## Exports

### `readGlassCatalogs(proxy)`
```ts
readGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult
```

- Starts `proxy.getAllGlassCatalogsData()` on the first read for a given worker proxy
- Deduplicates in-flight and completed requests with a module-level `WeakMap`
- Throws the pending promise while loading so a parent `Suspense` boundary can render a fallback
- Returns normalized data or an error string once the request settles

### `preloadGlassCatalogs(proxy)`
```ts
preloadGlassCatalogs(proxy: PyodideWorkerAPI): Promise<void>
```

- Starts the same shared load used by `readGlassCatalogs(proxy)` without throwing for Suspense
- Reuses the module-level cache, so preloading from `AppShell` and reading from `GlassMapView` or the lens editor never duplicate the worker request for the same proxy

### `peekGlassCatalogs(proxy)`
```ts
peekGlassCatalogs(proxy: PyodideWorkerAPI): GlassCatalogsLoadResult | undefined
```

- Returns the settled cached result when present
- Returns `undefined` while the request has not settled or was never started

### `_resetGlassCatalogsResourceForTest()`
```ts
_resetGlassCatalogsResourceForTest(): void
```

Test-only helper that clears the cache between Jest cases.

## Behavior
- Success result:
```ts
{ data: AllGlassCatalogsData; error: undefined }
```
- Failure result:
```ts
{ data: undefined; error: string }
```
- Raw worker data is normalized once with `normalizeAllCatalogsData()`
- `readGlassCatalogs`, `preloadGlassCatalogs`, and `peekGlassCatalogs` all share the same `WeakMap` cache keyed by worker proxy

## Usage
```tsx
const catalogsLoadResult = readGlassCatalogs(proxy);

if (catalogsLoadResult.error !== undefined) {
  return <div>{catalogsLoadResult.error}</div>;
}

const catalogsData = catalogsLoadResult.data;
```
