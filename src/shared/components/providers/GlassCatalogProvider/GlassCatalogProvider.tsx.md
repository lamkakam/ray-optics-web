# `shared/components/providers/GlassCatalogProvider/GlassCatalogProvider.tsx`

## Purpose
Client-only React context for app-wide glass catalog data. The provider does not fetch data itself; it injects loader state prepared by the shared app shell so lens editor and glass map consume the same source of truth.

## Context Value

```ts
interface GlassCatalogContextValue {
  catalogs: AllGlassCatalogsData | undefined;
  lookupMaps: GlassLookupMaps | undefined;
  error: string | undefined;
  isLoaded: boolean;
  isLoading: boolean;
  preload: () => Promise<GlassCatalogsLoadResult | undefined>;
}
```

## Behaviour
- `catalogs` contains normalized worker-backed glass catalog data once loaded
- `lookupMaps` contains the case-insensitive manufacturer and medium maps built from the same loaded catalog data
- `error` contains the last load failure message, if any
- `isLoaded` is `true` after the preload settles successfully
- `isLoading` is `true` while the shared shell preload is in flight
- `preload()` reuses the shared loader path and returns the cached result when available

## Exports
- `GlassCatalogContext` — raw context, primarily for tests
- `GlassCatalogProvider` — injects a prepared `GlassCatalogContextValue`
- `useGlassCatalogs()` — throws outside the provider
