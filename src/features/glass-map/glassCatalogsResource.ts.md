# `features/glass-map/glassCatalogsResource.ts`

## Purpose
Feature-level compatibility shim that re-exports the shared glass-catalog loader from `shared/lib/data/glassCatalogsResource.ts`.

## Exports

Re-exported symbols:
- `readGlassCatalogs`
- `preloadGlassCatalogs`
- `peekGlassCatalogs`
- `_resetGlassCatalogsResourceForTest`
- `GlassCatalogsLoadResult`

## Behavior
- Keeps existing feature imports working while the canonical implementation lives in the shared data layer
- Shares cache state with the app-shell preload and any other consumers of the shared loader
