# `app/glass-map/page.tsx`

## Purpose
Glass Map route page (`/glass-map`).

## Behaviour
- Reads `proxy` and `isReady` from `useAppShell()`
- Wraps query-param parsing in a `React.Suspense` boundary to satisfy the App Router build requirement for `useSearchParams()`
- Reads `source`, `catalog`, and `glass` from `useSearchParams()` inside the Suspense-wrapped child component
- Builds `routeIntent` only when `source=medium-selector` and both `catalog` and `glass` are present
- Renders `GlassMapView` with the shared Pyodide worker state and the optional route intent
- Uses `GlassMapView` without route intent as the Suspense fallback
