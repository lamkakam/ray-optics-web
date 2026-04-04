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

## Usage
```tsx
const catalogsLoadResult = readGlassCatalogs(proxy);

if (catalogsLoadResult.error !== undefined) {
  return <div>{catalogsLoadResult.error}</div>;
}

const catalogsData = catalogsLoadResult.data;
```
