"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export type ImagePoint = "chief_ray" | "centroid";

interface ImagePointContextValue {
  readonly imagePoint: ImagePoint;
  readonly setImagePoint: (newImagePoint: ImagePoint) => void;
}

const ImagePointContext = createContext<ImagePointContextValue | undefined>(undefined);

const STORAGE_KEY = "ray-optics-web-image-point";
const LEGACY_STORAGE_KEY = "ray-optics-web-opd-aim-point";

function isImagePoint(value: unknown): value is ImagePoint {
  return value === "chief_ray" || value === "centroid";
}

function getInitialImagePoint(): ImagePoint {
  if (typeof window === "undefined") return "chief_ray";

  const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  return isImagePoint(stored) ? stored : "chief_ray";
}

export function ImagePointProvider({ children }: { readonly children: React.ReactNode }) {
  const [imagePoint, _setImagePoint] = useState<ImagePoint>(getInitialImagePoint);

  const setImagePoint = useCallback((newImagePoint: ImagePoint) => {
    if (!isImagePoint(newImagePoint)) return;
    _setImagePoint(newImagePoint);
    localStorage.setItem(STORAGE_KEY, newImagePoint);
  }, []);

  return (
    <ImagePointContext value={{ imagePoint, setImagePoint }}>
      {children}
    </ImagePointContext>
  );
}

export function useImagePoint(): ImagePointContextValue {
  const ctx = useContext(ImagePointContext);
  if (ctx === undefined) {
    throw new Error("useImagePoint must be used within an ImagePointProvider");
  }
  return ctx;
}
