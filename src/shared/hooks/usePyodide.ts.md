# `shared/hooks/usePyodide.ts`

## Purpose

Initialise the singleton Pyodide web worker and expose a typed Comlink proxy to the rest of the app. All RayOptics computations run in the web worker; this hook provides the React interface to them.

## PyodideWorkerAPI Interface

```ts
interface PyodideWorkerAPI {
  init(): Promise<void>;
  getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>>;
  plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string>;
  plotRayFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string>;
  getRayFanData(opticalModel: OpticalModel, fieldIndex: number): Promise<RayFanData>;
  plotOpdFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string>;
  getOpdFanData(opticalModel: OpticalModel, fieldIndex: number): Promise<OpdFanData>;
  plotSpotDiagram(opticalModel: OpticalModel, fieldIndex: number): Promise<string>;
  getSpotDiagramData(opticalModel: OpticalModel, fieldIndex: number): Promise<SpotDiagramData>;
  plotSurfaceBySurface3rdOrderAberr(opticalModel: OpticalModel): Promise<string>;
  plotWavefrontMap(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<string>;
  getWavefrontData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<WavefrontMapData>;
  getGeoPSFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<GeoPsfData>;
  plotGeoPSF(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<string>;
  plotDiffractionPSF(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<string>;
  getDiffractionPSFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<DiffractionPsfData>;
  get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData>;
  getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, numTerms?: number): Promise<ZernikeData>;
  focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  getAllGlassCatalogsData(): Promise<RawAllGlassCatalogsData>;
  optimizeOpm(opticalModel: OpticalModel, config: OptimizationConfig): Promise<OptimizationReport>;
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
- `OpticalModel` — imported from `shared/lib/types/opticalModel` (type only).
- `SeidelData` — imported from `shared/lib/types/opticalModel` (type only).
- `DiffractionPsfData` — imported from `shared/lib/types/opticalModel` (type only).
- `WavefrontMapData` — imported from `shared/lib/types/opticalModel` (type only).
- `GeoPsfData` — imported from `shared/lib/types/opticalModel` (type only).
- `RayFanData` — imported from `shared/lib/types/opticalModel` (type only).
- `OpdFanData` — imported from `shared/lib/types/opticalModel` (type only).
- `SpotDiagramData` — imported from `shared/lib/types/opticalModel` (type only).
- `ZernikeData` — imported from `shared/lib/types/zernikeData` (type only).
- `SetAutoApertureFlag` — imported from `shared/lib/utils/apertureFlag` (type only).
- `OptimizationConfig`, `OptimizationReport` — imported from `shared/lib/types/optimization` (type only).

## Edge Cases / Error Handling

- Multiple hook instances share the same singleton proxy and init promise — calling the hook from many components is safe.
- Errors from `proxy.init()` are caught and stored as a plain string in `error`; the worker itself remains alive.
- `proxy` is `undefined` while initialising, preventing callers from invoking methods before the worker is ready.
- `plotLensLayout` requires the caller to provide `isDark`; the worker derives any diffraction-grating-dependent overlay from the `OpticalModel`.
- `_resetSingleton()` is exported for test isolation only — NOT for production use.

## Usages

**1. In a page container component (via DI pattern):**

```tsx
"use client";

import { usePyodide } from "@/hooks/usePyodide";
import { LensEditor } from "@/components/LensEditor";

export default function Page() {
  const { proxy, isReady, error } = usePyodide();

  if (!isReady && !error) {
    return <div>Loading Pyodide...</div>;
  }

  if (error) {
    return <div>Failed to initialize: {error}</div>;
  }

  // Pass the proxy to child components via DI
  return <LensEditor pyodideProxy={proxy} />;
}
```

**2. In a child component (receives proxy as prop):**

```tsx
interface LensEditorProps {
  pyodideProxy: PyodideWorkerAPI | undefined;
}

export function LensEditor({ pyodideProxy }: LensEditorProps) {
  const handleComputeAnalysis = async () => {
    if (!pyodideProxy) return;

    const firstOrderData = await pyodideProxy.getFirstOrderData(opticalModel);
    console.log("First-order data:", firstOrderData);
  };

  return (
    <button onClick={handleComputeAnalysis}>
      Compute Analysis
    </button>
  );
}
```

This pattern keeps child components testable without requiring a real Pyodide worker.
