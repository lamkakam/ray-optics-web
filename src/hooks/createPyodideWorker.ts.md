# `hooks/createPyodideWorker.ts`

## Purpose

Instantiate the Pyodide web worker. Extracted into its own module so that tests can mock it without encountering `import.meta.url` resolution issues.

## Return Value
Returns a new `Worker` instance backed by `workers/pyodide.worker.ts`.

## Behavior

Constructs the worker using the Next.js-required pattern:

```ts
new Worker(new URL("../workers/pyodide.worker.ts", import.meta.url))
```

The `new URL(..., import.meta.url)` form is mandatory — Next.js's webpack bundler uses it to locate and bundle the worker script correctly. DO NOT USE string paths.

## Edge Cases / Error Handling

- Each call returns a **new** `Worker` instance. Callers (i.e. `usePyodide`) are responsible for ensuring this is only called once (singleton pattern).
- No error handling inside — if the worker script fails to load, the `Worker` constructor throws and the caller handles it.

## Usages

Called exclusively by `usePyodide.ts` to create the singleton worker:

```ts
import { createPyodideWorker } from "@/hooks/createPyodideWorker";

// Inside usePyodide.ts
const worker = createPyodideWorker();
const proxy = wrap<PyodideWorkerAPI>(worker);
```

**In tests**, this module is replaced with a mock that returns a fake worker, avoiding `import.meta.url` and Pyodide initialisation overhead.
