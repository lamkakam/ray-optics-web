"use client";

import { useState, useEffect, useRef } from "react";
import { wrap } from "comlink";
import type { OpticalModel } from "@/lib/opticalModel";
import type { SetAutoApertureFlag } from "@/lib/apertureFlag";
import { createPyodideWorker } from "./createPyodideWorker";

export interface PyodideWorkerAPI {
  init(): Promise<void>;
  setOpticalSurfaces(model: OpticalModel, setAutoAperture: SetAutoApertureFlag): Promise<void>;
  getFirstOrderData(): Promise<Record<string, number>>;
  plotLensLayout(): Promise<string>;
  plotRayFan(fieldIndex: number): Promise<string>;
  plotOpdFan(fieldIndex: number): Promise<string>;
  plotSpotDiagram(fieldIndex: number): Promise<string>;
  plotSurfaceBySurface3rdOrderAberr(): Promise<string>;
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
