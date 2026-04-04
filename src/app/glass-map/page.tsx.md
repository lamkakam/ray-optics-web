# `app/glass-map/page.tsx`

## Purpose
Glass Map route page (`/glass-map`).

## Behaviour
- Reads `proxy` and `isReady` from `useAppShell()`
- Wraps query-param parsing in a `React.Suspense` boundary to satisfy the App Router build requirement for `useSearchParams()`
- Reads `source`, `catalog`, and `glass` from `useSearchParams()` inside the Suspense-wrapped child component
- Builds `routeIntent` only when `source=medium-selector` and both `catalog` and `glass` are present
- Keeps `routeIntent` as render data; it is not mirrored into the persistent glass-map store with an effect
- Renders `GlassMapView` under an inner `Suspense` boundary so the catalog resource can suspend independently of the search-param boundary
- Uses a stable `routeIntentKey` so route-intent-local UI override state resets when the URL intent changes
- Keeps `GlassMapView` under the same long-lived store instance, so plot filters and selection survive page switches
- Renders `GlassMapView` with the shared Pyodide worker state and the optional route intent
- Uses the same loading placeholder for both search-param suspense and catalog-resource suspense
