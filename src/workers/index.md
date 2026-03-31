# `workers/`

Web Worker implementations for background computation.

## Workers

- [pyodide.worker.ts](./pyodide.worker.ts.md) — Pyodide worker for executing RayOptics Python code: init(), runPython(), and domain functions (createModel, updateSurface, getLensLayoutData, getAnalysisData, etc.) via Comlink RPC
