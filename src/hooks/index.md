# `hooks/`

App-wide React hook for the Pyodide worker lifecycle. Shared/feature-specific hooks live under `shared/hooks/` and `features/*/`.

## Hooks

- [usePyodide.ts](./usePyodide.ts.md) — Initialises the singleton Pyodide web worker and exposes a typed Comlink proxy to the rest of the app
