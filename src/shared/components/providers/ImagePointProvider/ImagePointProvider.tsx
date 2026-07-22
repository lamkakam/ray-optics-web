"use client";
/** App-wide image-reference selection and its persistent browser-storage contract. */

import React, { createContext, useCallback, useContext, useState } from "react";

/** Reference point used by spot, wavefront-like, and OPD-related analyses. */
export type ImagePoint = "chief_ray" | "centroid";

interface ImagePointContextValue {
  /** Currently selected analysis reference point. */
  readonly imagePoint: ImagePoint;
  /** Validates, stores, and persists a new analysis reference point. */
  readonly setImagePoint: (newImagePoint: ImagePoint) => void;
}

const ImagePointContext = createContext<ImagePointContextValue | undefined>(undefined);

/** Current browser-storage key for the image-reference preference. */
const STORAGE_KEY = "ray-optics-web-image-point";
/** Previous browser-storage key read once for preference migration. */
const LEGACY_STORAGE_KEY = "ray-optics-web-opd-aim-point";

/** Checks whether an unknown persisted value is a supported image reference. */
function isImagePoint(value: unknown): value is ImagePoint {
  return value === "chief_ray" || value === "centroid";
}

/** Reads the persisted preference, including the legacy-key fallback. */
function getInitialImagePoint(): ImagePoint {
  if (typeof window === "undefined") return "chief_ray";

  const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  return isImagePoint(stored) ? stored : "chief_ray";
}

/**
 * Provides app-wide image-point state for spot, wavefront-like, and OPD-related analyses.
 *
 * @remarks
 * ## Behavior
 *
 * - Defaults to `"chief_ray"` to preserve the existing RayOptics reference convention.
 * - Persists valid updates to the new `localStorage` key.
 * - Ignores invalid persisted values and invalid runtime updates.
 */
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

/**
 * Reads the app-wide image-reference state and updater.
 *
 * @throws When called outside an {@link ImagePointProvider}.
 */
export function useImagePoint(): ImagePointContextValue {
  const ctx = useContext(ImagePointContext);
  if (ctx === undefined) {
    throw new Error("useImagePoint must be used within an ImagePointProvider");
  }
  return ctx;
}
