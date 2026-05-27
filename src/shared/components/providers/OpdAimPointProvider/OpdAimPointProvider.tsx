"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export type OpdAimPoint = "chief_ray" | "centroid";

interface OpdAimPointContextValue {
  readonly opdAimPoint: OpdAimPoint;
  readonly setOpdAimPoint: (newOpdAimPoint: OpdAimPoint) => void;
}

const OpdAimPointContext = createContext<OpdAimPointContextValue | undefined>(undefined);

const STORAGE_KEY = "ray-optics-web-opd-aim-point";

function isOpdAimPoint(value: unknown): value is OpdAimPoint {
  return value === "chief_ray" || value === "centroid";
}

function getInitialOpdAimPoint(): OpdAimPoint {
  if (typeof window === "undefined") return "chief_ray";

  const stored = localStorage.getItem(STORAGE_KEY);
  return isOpdAimPoint(stored) ? stored : "chief_ray";
}

export function OpdAimPointProvider({ children }: { readonly children: React.ReactNode }) {
  const [opdAimPoint, _setOpdAimPoint] = useState<OpdAimPoint>(getInitialOpdAimPoint);

  const setOpdAimPoint = useCallback((newOpdAimPoint: OpdAimPoint) => {
    if (!isOpdAimPoint(newOpdAimPoint)) return;
    _setOpdAimPoint(newOpdAimPoint);
    localStorage.setItem(STORAGE_KEY, newOpdAimPoint);
  }, []);

  return (
    <OpdAimPointContext value={{ opdAimPoint, setOpdAimPoint }}>
      {children}
    </OpdAimPointContext>
  );
}

export function useOpdAimPoint(): OpdAimPointContextValue {
  const ctx = useContext(OpdAimPointContext);
  if (ctx === undefined) {
    throw new Error("useOpdAimPoint must be used within an OpdAimPointProvider");
  }
  return ctx;
}
