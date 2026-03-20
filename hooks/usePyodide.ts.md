# `hooks/usePyodide.ts`

## Purpose

Initialise the singleton Pyodide web worker and expose a typed Comlink proxy to the rest of the app. All RayOptics computations run in the web worker; this hook provides the React interface to them.

## PyodideWorkerAPI Interface

```ts
interface PyodideWorkerAPI {
  init(): Promise<void>;
  setOpticalSurfaces(model: OpticalModel, setAutoAperture: SetAutoApertureFlag): Promise<void>;
  getFirstOrderData(): Promise<Record<string, number>>;
  plotLensLayout(): Promise<string>;
  plotRayFan(fieldIndex: number): Promise<string>;
  plotOpdFan(fieldIndex: number): Promise<string>;
  plotSpotDiagram(fieldIndex: number): Promise<string>;
  plotSurfaceBySurface3rdOrderAberr(): Promise<string>;
  get3rdOrderSeidelData(): Promise<SeidelData>;
  getZernikeCoefficients(fieldIndex: number, wvlIndex: number, numTerms?: number): Promise<ZernikeData>;
}
```

## Return Value

```ts
{
  proxy: PyodideWorkerAPI | undefined;  // undefined until isReady is true
  isReady: boolean;
  error: string | undefined;
}
```

## Behavior

1. On first render the hook calls `initOnce()`, which:
   - Calls `createPyodideWorker()` once to create the underlying `Worker`.
   - Wraps the worker with `comlink.wrap<PyodideWorkerAPI>()` to produce `singletonProxy`.
   - Calls `proxy.init()` once and stores the resulting promise in `singletonInitPromise`.
2. When the init promise resolves, `isReady` becomes `true` and `proxy` is returned.
3. Subsequent hook instances (e.g. in sibling components) reuse `singletonProxy` and `singletonInitPromise` — `init()` is never called more than once.
4. If `init()` rejects, `error` is set to the error message string and `proxy` remains `undefined`.

## Dependencies

- `createPyodideWorker` — function that creates the `Worker` instance.
- `comlink.wrap` — wraps the worker as a typed async proxy.
- `OpticalModel` — imported from `lib/opticalModel` (type only).
- `SeidelData` — imported from `lib/opticalModel` (type only).
- `ZernikeData` — imported from `lib/zernikeData` (type only).
- `SetAutoApertureFlag` — imported from `lib/apertureFlag` (type only).

## Edge Cases / Error Handling

- Multiple hook instances share the same singleton proxy and init promise — calling the hook from many components is safe.
- Errors from `proxy.init()` are caught and stored as a plain string in `error`; the worker itself remains alive.
- `proxy` is `undefined` while initialising, preventing callers from invoking methods before the worker is ready.
- `_resetSingleton()` is exported for test isolation only — NOT for production use.

## Usages

Used by container components (e.g. the main page container) that coordinate calls to the worker. Components should receive `proxy`, `isReady`, and `error` as props via dependency injection rather than calling this hook directly, to keep them testable without a real worker.
