"use client";

import { useState, useEffect, useRef } from "react";
import { proxy as comlinkProxy, wrap } from "comlink";
import type { OpticalModel } from "@/shared/lib/types/opticalModel";
import type { FocusingResult } from "@/features/lens-editor/types/focusingResult";
import type { DiffractionMtfData, DiffractionPsfData, GeoPsfData, OpdFanData, RayFanData, SpotDiagramData, WavefrontMapData } from "@/features/analysis/types/plotData";
import type { SeidelData } from "@/features/lens-editor/types/seidelData";
import type {
  OptimizationConfig,
  OptimizationProgressEntry,
  OptimizationReport,
} from "@/features/optimization/types/optimizationWorkerTypes";
import type { ZernikeData, ZernikeOrdering } from "@/features/lens-editor/types/zernikeData";
import type { RawAllGlassCatalogsData } from "@/features/glass-map/types/glassMap";
import { createPyodideWorker } from "@/workers/createPyodideWorker";

export interface InitProgress {
  readonly value: number;
  readonly status: string;
}

type InitProgressCallback = (progress: InitProgress) => void | Promise<void>;

export interface PyodideWorkerAPI {
  init(onProgress?: InitProgressCallback): Promise<void>;
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
  getDiffractionMTFData(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, numRays?: number, maxDims?: number): Promise<DiffractionMtfData>;
  get3rdOrderSeidelData(opticalModel: OpticalModel): Promise<SeidelData>;
  getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, numTerms?: number, ordering?: ZernikeOrdering): Promise<ZernikeData>;
  focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  getAllGlassCatalogsData(): Promise<RawAllGlassCatalogsData>;
  evaluateOptimizationProblem(opticalModel: OpticalModel, config: OptimizationConfig): Promise<OptimizationReport>;
  optimizeOpm(
    opticalModel: OpticalModel,
    config: OptimizationConfig,
    onProgress?: (progress: ReadonlyArray<OptimizationProgressEntry>) => void | Promise<void>,
  ): Promise<OptimizationReport>;
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
