# `shared/hooks/`

React hooks for shared, cross-feature logic. These hooks have no dependency on specific feature stores or components.

## Hooks

- [useAgGridTheme.ts](./useAgGridTheme.ts.md) — Hook to provide AG Grid theming based on current light/dark mode
- [useScreenBreakpoint.ts](./useScreenBreakpoint.ts.md) — Hook to detect screen size breakpoints for responsive design
- [useServiceWorkerRegistration.ts](./useServiceWorkerRegistration.ts.md) — Hook to register and manage the service worker for offline support
- [usePyodide.ts](./usePyodide.ts.md) — Initialises the singleton Pyodide web worker and exposes a typed Comlink proxy to the rest of the app
