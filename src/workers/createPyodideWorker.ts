/**
## Return Value
Returns a new `Worker` instance backed by `workers/pyodide.worker.ts`.
*/
/**
 * Factory for the Pyodide web worker.
 * Extracted to its own module so tests can mock it
 * without hitting import.meta.url issues.
 */
/**
Instantiate the Pyodide web worker. Extracted into its own module so that tests can mock it without encountering `import.meta.url` resolution issues.

## Behavior

Constructs the worker using the Next.js-required pattern:

```ts
new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module" })
```

The `new URL(..., import.meta.url)` form is mandatory — Next.js's webpack bundler uses it to locate and bundle the worker script correctly. The `{ type: "module" }` option is required because the worker imports the Pyodide npm loader. DO NOT USE string paths or a classic worker.

Both `next dev` and production builds must preserve this option in the emitted App Router browser bundle. The development regression test exercises the running browser because webpack otherwise rewrites the option to `type: undefined`, which makes Pyodide reject the resulting classic worker.

## Edge Cases / Error Handling

- Each call returns a **new** `Worker` instance. Callers (i.e. `usePyodide`) are responsible for ensuring this is only called once (singleton pattern).
- No error handling inside — if the worker script fails to load, the `Worker` constructor throws and the caller handles it.

**In tests**, this module is replaced with a mock that returns a fake worker, avoiding `import.meta.url` and Pyodide initialisation overhead.
*/
export function createPyodideWorker(): Worker {
  return new Worker(
    new URL("./pyodide.worker.ts", import.meta.url),
    { type: "module" },
  );
}
