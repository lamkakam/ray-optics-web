"use client";
/**
 * React ownership of the singleton Pyodide worker, Comlink proxy, initialization
 * promise, and progress fan-out shared by all hook instances.
 */

import { useState, useEffect, useRef } from "react";
import { proxy as comlinkProxy, wrap } from "comlink";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { FocusingResult } from "@/features/lens-editor/types/focusingResult";
import type { AstigmatismCurveData, DiffractionMtfData, DiffractionPsfData, FieldCurveData, GeoPsfData, LongitudinalSphericalAberrationData, OpdFanData, RayFanData, SpotDiagramData, StrehlVsWavelengthData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type {
  GlassOptimizationConfig,
  GlassOptimizationReport,
  OptimizationConfig,
  OptimizationProgressEntry,
  OptimizationReport,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import type {
  AllGlassCatalogsData,
  UserDefinedMaterialsData,
  UserDefinedGlassInput,
} from "@/features/glass-map/types/glassMap";
import type { ImagePoint } from "@/shared/components/providers/ImagePointProvider";
import { createPyodideWorker } from "@/workers/createPyodideWorker";

/** Determinate worker initialization percentage and status text. */
export interface InitProgress {
  readonly value: number;
  readonly status: string;
}

type InitProgressCallback = (progress: InitProgress) => void | Promise<void>;

/** Typed Comlink surface exposed by the Pyodide worker. */
export interface PyodideWorkerAPI {
  /** Initializes the worker and optionally reports deterministic startup milestones. */
  init(onProgress?: InitProgressCallback): Promise<void>;
  /** Returns first-order optical data for a model. */
  getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>>;
  /** Returns sequential Object-through-Image surface semi-diameters. */
  getSurfaceSemiDiameters(opticalModel: OpticalModel): Promise<number[]>;
  /** Returns a themed base64 lens-layout image. */
  plotLensLayout(opticalModel: OpticalModel, isDark: boolean): Promise<string>;
  /** Returns transverse ray-fan data for one field and image reference. */
  getRayFanData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<RayFanData>;
  /** Returns OPD-fan data for one field and image reference. */
  getOpdFanData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<OpdFanData>;
  /** Returns spot-diagram points for one field and image reference. */
  getSpotDiagramData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint): Promise<SpotDiagramData>;
  /** Returns field-curvature data for one wavelength. */
  getFieldCurvatureData(opticalModel: OpticalModel, wvlIndex: number): Promise<FieldCurveData>;
  /** Returns astigmatism data for one wavelength. */
  getAstigmatismCurveData(opticalModel: OpticalModel, wvlIndex: number): Promise<AstigmatismCurveData>;
  /** Returns longitudinal spherical-aberration data for all wavelengths. */
  getLSAData(opticalModel: OpticalModel): Promise<LongitudinalSphericalAberrationData>;
  /** Returns a sampled wavefront map. */
  getWavefrontData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numRays?: number): Promise<WavefrontMapData>;
  /** Returns Strehl values sampled across wavelength. */
  getStrehlVsWavelengthData(opticalModel: OpticalModel, fieldIndex: number, imagePoint?: ImagePoint, wavelengthSamples?: number, numRays?: number): Promise<StrehlVsWavelengthData>;
  /** Returns geometric-PSF points. */
  getGeoPSFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number): Promise<GeoPsfData>;
  /** Returns a sampled diffraction-PSF grid. */
  getDiffractionPSFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionPsfData>;
  /** Returns diffraction-MTF line data. */
  getDiffractionMTFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numRays?: number, maxDims?: number): Promise<DiffractionMtfData>;
  /** Returns third-order Seidel aberration data. */
  get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData>;
  /** Returns coefficients for an explicit frontend-selected Zernike ordering. */
  getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, imagePoint?: ImagePoint, numTerms?: number, ordering?: ZernikeOrdering): Promise<ZernikeData>;
  /** Focuses by monochromatic RMS spot radius. */
  focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  /** Focuses by monochromatic Strehl ratio. */
  focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  /** Focuses by polychromatic RMS spot radius. */
  focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  /** Focuses by polychromatic Strehl ratio. */
  focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  /** Returns all normalized built-in glass catalogs. */
  getAllGlassCatalogsData(): Promise<AllGlassCatalogsData>;
  /** Adds tabulated user-defined materials. */
  addUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>;
  /** Deletes named user-defined materials. */
  deleteUserDefinedGlasses(names: readonly string[]): Promise<void>;
  /** Replaces tabulated user-defined materials. */
  updateUserDefinedGlasses(materials: readonly UserDefinedGlassInput[]): Promise<UserDefinedMaterialsData>;
  /** Returns named user-defined materials. */
  getUserDefinedGlasses(names: readonly string[]): Promise<UserDefinedMaterialsData>;
  /** Reports whether shared-buffer optimization interruption is available. */
  canInterruptOptimization(): Promise<boolean>;
  /** Signals the active optimization only when its run id matches. */
  requestOptimizationStop(runId: string): Promise<{ readonly signaled: boolean }>;
  /** Evaluates residuals without running the optimizer. */
  evaluateOptimizationProblem(opticalModel: OpticalModel, config: OptimizationConfig, imagePoint?: ImagePoint): Promise<OptimizationReport>;
  /** Runs optimization with optional proxied progress and per-run interruption. */
  optimizeOpm(
    opticalModel: OpticalModel,
    config: OptimizationConfig,
    imagePoint?: ImagePoint,
    onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
    runId?: string,
    interruptBuffer?: SharedArrayBuffer,
  ): Promise<OptimizationReport>;
  /** Runs mixed glass/continuous optimization with the same progress and interrupt lifecycle. */
  optimizeGlasses(
    opticalModel: OpticalModel,
    config: GlassOptimizationConfig,
    imagePoint?: ImagePoint,
    onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
    runId?: string,
    interruptBuffer?: SharedArrayBuffer,
  ): Promise<GlassOptimizationReport>;
}

// Singleton state — shared across all hook instances
let singletonProxy: PyodideWorkerAPI | undefined;
let singletonInitPromise: Promise<void> | undefined;
let singletonInitProgress: InitProgress = {
  value: 0,
  status: "Starting worker",
};
const initProgressListeners = new Set<(progress: InitProgress) => void>();

function getProxy(): PyodideWorkerAPI {
  if (!singletonProxy) {
    const worker = createPyodideWorker();
    singletonProxy = wrap<PyodideWorkerAPI>(worker);
  }
  return singletonProxy;
}

function initOnce(): Promise<void> {
  if (!singletonInitPromise) {
    const proxy = getProxy();
    singletonInitPromise = proxy.init(comlinkProxy((progress: InitProgress) => {
      singletonInitProgress = progress;
      initProgressListeners.forEach((listener) => listener(progress));
    }));
  }
  return singletonInitPromise;
}

/**
 * Initialise the singleton Pyodide web worker and expose a typed Comlink proxy to the rest of the app. All RayOptics computations run in the web worker; this hook provides the React interface to them.
 *
 * @remarks
 * ## Behavior
 *
 * 1. On first render the hook calls `initOnce()`, which:
 * - Calls `createPyodideWorker()` once to create the underlying `Worker`.
 * - Wraps the worker with `comlink.wrap<PyodideWorkerAPI>()` to produce `singletonProxy`.
 * - Calls `proxy.init(comlink.proxy(...))` once and stores the resulting promise in `singletonInitPromise`.
 * - Fans worker progress callbacks out to all mounted hook instances.
 * 2. When the init promise resolves, `isReady` becomes `true` and `proxy` is returned.
 * 3. Subsequent hook instances (e.g. in sibling components) reuse `singletonProxy` and `singletonInitPromise` — `init()` is never called more than once.
 * 4. If `init()` rejects, `error` is set to the error message string and `proxy` remains `undefined`.
 * 5. `initProgress` starts as `{ value: 0, status: "Starting worker" }` and updates as the worker emits initialization milestones.
 *
 * ## Edge Cases / Error Handling
 *
 * - Multiple hook instances share the same singleton proxy and init promise — calling the hook from many components is safe.
 * - Errors from `proxy.init()` are caught and stored as a plain string in `error`; the worker itself remains alive.
 * - `proxy` is `undefined` while initialising, preventing callers from invoking methods before the worker is ready.
 * - `plotLensLayout` requires the caller to provide `isDark`; the worker derives any diffraction-grating-dependent overlay from the `OpticalModel`.
 * - `evaluateOptimizationProblem` and `optimizeOpm` share the same report shape, so optimization UIs can preview residuals before running the full solve. `optimizeGlasses` extends that report with initial/final glass identities and categorical optimizer metadata.
 * - User-defined glass APIs are passed through to the worker as typed Comlink methods. Add/update/get return the bare Python material map keyed by glass name; delete resolves with no payload.
 * - `canInterruptOptimization()` reports whether the initialized worker can install a Pyodide interrupt buffer.
 * - `requestOptimizationStop(runId)` asks the worker to signal the currently active optimization only when the run id still matches; late or stale run ids return `{ signaled: false }`.
 * - `optimizeOpm` and `optimizeGlasses` accept the same optional streamed progress callback and interruption arguments; callers that pass a function must wrap it with `comlink.proxy(...)` before invoking the worker. Glass progress may additionally include phase, surface, and candidate context.
 * - `init` accepts an optional progress callback for determinate startup milestones; `usePyodide` owns the Comlink proxy wrapping for this callback.
 * - `_resetSingleton()` is exported for test isolation only — NOT for production use.
 *
 * This pattern keeps child components testable without requiring a real Pyodide worker.
 */
export function usePyodide(): {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  error: string | undefined;
  initProgress: InitProgress;
} {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [initProgress, setInitProgress] = useState<InitProgress>(singletonInitProgress);
  const initCalled = useRef(false);

  useEffect(() => {
    initProgressListeners.add(setInitProgress);

    if (!initCalled.current) {
      initCalled.current = true;

      initOnce()
        .then(() => setIsReady(true))
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          setError(message);
        });
    }

    return () => {
      initProgressListeners.delete(setInitProgress);
    };
  }, []);

  return {
    proxy: isReady ? getProxy() : undefined,
    isReady,
    error,
    initProgress,
  };
}

/** Reset singleton state. Only for testing. */
export function _resetSingleton(): void {
  singletonProxy = undefined;
  singletonInitPromise = undefined;
  singletonInitProgress = {
    value: 0,
    status: "Starting worker",
  };
  initProgressListeners.clear();
}
