# `shared/components/providers/GlassCatalogProvider/GlassCatalogProvider.tsx`

## Purpose
Client-only React context for app-wide glass catalog data. The provider does not fetch data itself; `AppShell` injects successful catalog data from `GlassMapStore` plus AppShell-local preload status/error so lens editor and glass map consume a shared context.

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
- `catalogs` contains normalized worker-backed glass catalog data once AppShell has successfully loaded and committed it to `GlassMapStore`
- `lookupMaps` contains the case-insensitive manufacturer and medium maps built by `GlassMapStore` from the same loaded catalog data
- `error` contains the AppShell-local preload failure message, if any
- `isLoaded` is derived from AppShell-local preload status
- `isLoading` is `true` while the shared shell preload is in flight before success or failure
- `preload()` reuses the shared loader path, commits successful data to `GlassMapStore`, updates AppShell-local status/error, and returns the cached result when available

## Exports
- `GlassCatalogContext` — raw context, primarily for tests
- `GlassCatalogProvider` — injects a prepared `GlassCatalogContextValue`
- `useGlassCatalogs()` — throws outside the provider
