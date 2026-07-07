# `shared/hooks/usePyodide.ts`

## Purpose

Initialise the singleton Pyodide web worker and expose a typed Comlink proxy to the rest of the app. All RayOptics computations run in the web worker; this hook provides the React interface to them.

## PyodideWorkerAPI Interface

```ts
interface InitProgress {
  readonly value: number;
  readonly status: string;
}

interface PyodideWorkerAPI {
  init(onProgress?: (progress: InitProgress) => void | Promise<void>): Promise<void>;
  getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>>;
  plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string>;
  getRayFanData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<RayFanData>;
  getOpdFanData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<OpdFanData>;
  getSpotDiagramData(opticalModel: OpticalModel, fieldIndex: number): Promise<SpotDiagramData>;
  getFieldCurvatureData(opticalModel: OpticalModel, wvlIndex: number): Promise<FieldCurveData>;
  getAstigmatismCurveData(opticalModel: OpticalModel, wvlIndex: number): Promise<AstigmatismCurveData>;
  getLSAData(opticalModel: OpticalModel): Promise<LongitudinalSphericalAberrationData>;
  getWavefrontData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numRays?: number): Promise<WavefrontMapData>;
  getStrehlVsWavelengthData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint, wavelengthSamples?: number, numRays?: number): Promise<StrehlVsWavelengthData>;
  getGeoPSFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<GeoPsfData>;
  getDiffractionPSFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionPsfData>;
  getDiffractionMTFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionMtfData>;
  get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData>;
  getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numTerms?: number, ordering?: ZernikeOrdering): Promise<ZernikeData>;
  focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  getAllGlassCatalogsData(): Promise<AllGlassCatalogsData>;
  addUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>;
  deleteUserDefinedGlasses(names: readonly string[]): Promise<void>;
  updateUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>;
  getUserDefinedGlasses(names: readonly string[]): Promise<UserDefinedMaterialsData>;
  canInterruptOptimization(): Promise<boolean>;
  requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }>;
  evaluateOptimizationProblem(opticalModel: OpticalModel, config: OptimizationConfig, imagePoint?: ImagePoint): Promise<OptimizationReport>;
  optimizeOpm(
    opticalModel: OpticalModel,
    config: OptimizationConfig,
    imagePoint?: ImagePoint,
    onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
    runId?: string,
    interruptBuffer?: SharedArrayBuffer,
  ): Promise<OptimizationReport>;
}
```

## Return Value

```ts
{
  proxy: PyodideWorkerAPI | undefined;  // undefined until isReady is true
  isReady: boolean;
  error: string | undefined;
  initProgress: InitProgress;
}
```

## Behavior

1. On first render the hook calls `initOnce()`, which:
   - Calls `createPyodideWorker()` once to create the underlying `Worker`.
   - Wraps the worker with `comlink.wrap<PyodideWorkerAPI>()` to produce `singletonProxy`.
   - Calls `proxy.init(comlink.proxy(...))` once and stores the resulting promise in `singletonInitPromise`.
   - Fans worker progress callbacks out to all mounted hook instances.
2. When the init promise resolves, `isReady` becomes `true` and `proxy` is returned.
3. Subsequent hook instances (e.g. in sibling components) reuse `singletonProxy` and `singletonInitPromise` — `init()` is never called more than once.
4. If `init()` rejects, `error` is set to the error message string and `proxy` remains `undefined`.
5. `initProgress` starts as `{ value: 0, status: "Starting worker" }` and updates as the worker emits initialization milestones.

## Dependencies

- `createPyodideWorker` — function that creates the `Worker` instance.
- `comlink.wrap` — wraps the worker as a typed async proxy.
- `OpticalModel` — imported from `shared/lib/types/opticalModel` (type only).
- `FocusingResult` — imported from `features/lens-editor/types/focusingResult` (type only).
- `SeidelData` — imported from `features/lens-editor/types/seidelData` (type only).
- `DiffractionPsfData` — imported from `features/analysis/types/plotData` (type only).
- `DiffractionMtfData` — imported from `features/analysis/types/plotData` (type only).
- `WavefrontMapData` — imported from `features/analysis/types/plotData` (type only).
- `StrehlVsWavelengthData` — imported from `features/analysis/types/plotData` (type only).
- `GeoPsfData` — imported from `features/analysis/types/plotData` (type only).
- `RayFanData` — imported from `features/analysis/types/plotData` (type only).
- `OpdFanData` — imported from `features/analysis/types/plotData` (type only).
- `SpotDiagramData` — imported from `features/analysis/types/plotData` (type only).
- `FieldCurveData`, `AstigmatismCurveData`, and `LongitudinalSphericalAberrationData` — imported from `features/analysis/types/plotData` (type only).
- `ZernikeData`, `ZernikeOrdering` — imported from `features/lens-editor/types/zernikeData` (type only).
- `getZernikeCoefficients` keeps `ordering` as a frontend API parameter; the worker converts it to an explicit `(n, m)` term list before calling Python.
- `SetAutoApertureFlag` — imported from `shared/lib/utils/apertureFlag` (type only).
- `OptimizationConfig`, `OptimizationProgressEntry`, `OptimizationReport` — imported from `features/optimization/types/optimizationWorkerTypes` (type only).
- `AllGlassCatalogsData`, `UserDefinedMaterialsData`, and `UserDefinedGlassInput` — imported from `features/glass-map/types/glassMap` for catalog and user-defined glass worker APIs (type only).
- `ImagePoint` — imported from `shared/components/providers/ImagePointProvider` (type only). Image-point-aware APIs default to `"chief_ray"` when omitted.

## Edge Cases / Error Handling

- Multiple hook instances share the same singleton proxy and init promise — calling the hook from many components is safe.
- Errors from `proxy.init()` are caught and stored as a plain string in `error`; the worker itself remains alive.
- `proxy` is `undefined` while initialising, preventing callers from invoking methods before the worker is ready.
- `plotLensLayout` requires the caller to provide `isDark`; the worker derives any diffraction-grating-dependent overlay from the `OpticalModel`.
- `evaluateOptimizationProblem` and `optimizeOpm` share the same report shape, so optimization UIs can preview residuals before running the full solve.
- User-defined glass APIs are passed through to the worker as typed Comlink methods. Add/update/get return the bare Python material map keyed by glass name; delete resolves with no payload.
- `canInterruptOptimization()` reports whether the initialized worker can install a Pyodide interrupt buffer.
- `requestOptimizationStop(runId)` asks the worker to signal the currently active optimization only when the run id still matches; late or stale run ids return `{ signaled: false }`.
- `optimizeOpm` also accepts an optional streamed progress callback; callers that pass a function must wrap it with `comlink.proxy(...)` before invoking the worker. For stoppable runs, callers also pass a per-run id and a `SharedArrayBuffer` interrupt buffer.
- `init` accepts an optional progress callback for determinate startup milestones; `usePyodide` owns the Comlink proxy wrapping for this callback.
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
