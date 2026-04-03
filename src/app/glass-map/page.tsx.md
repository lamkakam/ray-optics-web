# `app/glass-map/page.tsx`

## Purpose
Glass Map route page (`/glass-map`).

## Behaviour
- Reads `proxy` and `isReady` from `useAppShell()`
- Reads `source`, `catalog`, and `glass` from `useSearchParams()`
- Builds `routeIntent` only when `source=medium-selector` and both `catalog` and `glass` are present
- Renders `GlassMapView` with the shared Pyodide worker state and the optional route intent
