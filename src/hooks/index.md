# `hooks/`

React hooks for shared logic across components.

## Hooks

- [usePyodide.ts](./usePyodide.ts.md) — Hook to initialize and access Pyodide worker for Python computation
- [createPyodideWorker.ts](./createPyodideWorker.ts.md) — Factory function for creating a Pyodide worker instance with Comlink
- [useAgGridTheme.ts](./useAgGridTheme.ts.md) — Hook to provide AG Grid theming based on current light/dark mode
- [useScreenBreakpoint.ts](./useScreenBreakpoint.ts.md) — Hook to detect screen size breakpoints for responsive design
- [useServiceWorkerRegistration.ts](./useServiceWorkerRegistration.ts.md) — Hook to register and manage the service worker for offline support
