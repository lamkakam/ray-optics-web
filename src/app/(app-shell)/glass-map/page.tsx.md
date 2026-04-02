# `app/(app-shell)/glass-map/page.tsx`

## Purpose
Glass Map route page (`/glass-map`) for the App Router shell.

## Behaviour
- Reads `proxy` and `isReady` from `useAppShell()`
- Renders `GlassMapView` with the shared Pyodide worker state
