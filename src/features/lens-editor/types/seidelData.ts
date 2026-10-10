import type { ReactNode } from "react";

/**
 * Surface labels, aberration names, and per-surface third-order contributions.
 *
 * @remarks
 * `C-I` (axial color) and `C-II` (lateral color) are RayOptics' primary chromatic coefficients, computed from the index difference between the first and last wavelengths in the spectral list. They are zero unless at least 3 wavelengths are defined, and aspheric (`"<surface>.asp"`) rows always have zero chromatic terms.
 */
export interface SeidelSurfaceBySurfaceData {
  aberrTypes: string[]; // ['S-I', 'S-II', 'S-III', 'S-IV', 'S-V', 'C-I', 'C-II']
  surfaceLabels: string[]; // surface labels (+ '<surface>.asp' rows) + 'sum'
  data: number[][]; // 7 x N matrix (row = aberration type, col = surface)
}

/** Defines third-order Seidel and primary chromatic aberration payload types used by the lens editor modal and analysis third-order chart. */
export interface SeidelData {
  surfaceBySurface: SeidelSurfaceBySurfaceData;
  transverse: Record<string, number>; // TSA, TCO, TAS, SAS, PTB, DST
  /** Waves of the central wavelength: Seidel W040, W131, W222, W220, W311, then primary chromatic W020 (axial color, `C-I / 2`) and W111 (lateral color, `C-II`). */
  wavefront: Record<string, number>;
  curvature: Record<string, number>; // TCV, SCV, PCV
}

/** Display labels keyed by Seidel aberration type. */
export interface AberrationTypeToLabel extends Record<string, ReactNode> {
  TSA: ReactNode;
  TCO: ReactNode;
  TAS: ReactNode;
  SAS: ReactNode;
  PTB: ReactNode;
  DST: ReactNode;
  W040: ReactNode;
  W131: ReactNode;
  W222: ReactNode;
  W220: ReactNode;
  W311: ReactNode;
  W020: ReactNode;
  W111: ReactNode;
  TCV: ReactNode;
  SCV: ReactNode;
  PCV: ReactNode;
}
