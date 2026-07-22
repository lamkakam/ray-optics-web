# `shared/hooks/`

React hooks for shared, cross-feature logic. These hooks have no dependency on specific feature stores or components.

## Hooks

- [useAgGridTheme.ts](./useAgGridTheme.ts) — Hook to provide AG Grid theming based on current light/dark mode
- [useDebouncedCallback.ts](./useDebouncedCallback.ts) — Hook to debounce delayed, cancelable side-effect callbacks while preserving the latest callback implementation
- [useScreenBreakpoint.ts](./useScreenBreakpoint.ts) — Hook to detect screen size breakpoints for responsive design
- [useServiceWorkerRegistration.ts](./useServiceWorkerRegistration.ts) — Hook to register and manage the service worker for offline support
- [usePyodide.ts](./usePyodide.ts) — Initialises the singleton Pyodide web worker and exposes a typed Comlink proxy to the rest of the app
