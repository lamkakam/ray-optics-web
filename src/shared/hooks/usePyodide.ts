"use client";

import { useState, useEffect, useRef } from "react";
import { wrap } from "comlink";
import type { DiffractionPsfData, GeoPsfData, OpdFanData, OpticalModel, SeidelData, FocusingResult, SpotDiagramData, WavefrontMapData } from "@/shared/lib/types/opticalModel";
import type { ZernikeData, ZernikeOrdering } from "@/shared/lib/types/zernikeData";
import type { RawAllGlassCatalogsData } from "@/shared/lib/types/glassMap";
import { createPyodideWorker } from "@/workers/createPyodideWorker";

export interface PyodideWorkerAPI {
  init(): Promise<void>;
  getFirstOrderData(opticalModel: OpticalModel): Promise<Record<string, number>>;
  plotLensLayout(opticalModel: OpticalModel): Promise<string>;
  plotRayFan(opticalModel: OpticalModel, fieldIndex: number): Promise<string>;
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
  getZernikeCoefficients(opticalModel: OpticalModel, fieldIndex: number, wvlIndex: number, numTerms?: number, ordering?: ZernikeOrdering): Promise<ZernikeData>;
  focusByMonoRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByMonoStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyRmsSpot(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  focusByPolyStrehl(opticalModel: OpticalModel, fieldIndex: number): Promise<FocusingResult>;
  getAllGlassCatalogsData(): Promise<RawAllGlassCatalogsData>;
}

// Singleton state — shared across all hook instances
let singletonProxy: PyodideWorkerAPI | undefined;
let singletonInitPromise: Promise<void> | undefined;

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
    singletonInitPromise = proxy.init();
  }
  return singletonInitPromise;
}

export function usePyodide(): {
  proxy: PyodideWorkerAPI | undefined;
  isReady: boolean;
  error: string | undefined;
} {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    initOnce()
      .then(() => setIsReady(true))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError(message);
      });
  }, []);

  return {
    proxy: isReady ? getProxy() : undefined,
    isReady,
    error,
  };
}

/** Reset singleton state. Only for testing. */
export function _resetSingleton(): void {
  singletonProxy = undefined;
  singletonInitPromise = undefined;
}
