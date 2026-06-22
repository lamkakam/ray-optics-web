# `workers/loadPyodideModule.ts`

Natively imports Pyodide's `pyodide.asm.mjs` module factory from the supplied versioned CDN URL. `webpackIgnore` is required so webpack does not convert the computed remote import into a local context lookup. The factory is passed to the npm package's `loadPyodide` function by the worker.
