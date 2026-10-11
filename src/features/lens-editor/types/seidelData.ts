/**
 * Surface labels, aberration names, and per-surface third-order contributions.
 *
 * @remarks
 * Each surface has one column; RayOptics' separate aspheric (`"<surface>.asp"`) contributions are already added into their surface. For Seidel coefficients, `C-I` (axial color) and `C-II` (lateral color) are RayOptics' primary chromatic coefficients, computed from the index difference between the first and last wavelengths in the spectral list. They are zero unless at least 3 wavelengths are defined, and aspheric contributions add no chromatic terms.
 */
export interface SeidelSurfaceBySurfaceData {
  aberrTypes: string[]; // e.g. ['S-I', 'S-II', 'S-III', 'S-IV', 'S-V', 'C-I', 'C-II']
  surfaceLabels: string[]; // surface labels + 'sum'
  data: number[][]; // aberrTypes.length x N matrix (row = aberration type, col = surface)
}

/** Defines third-order Seidel and primary chromatic aberration payload types used by the lens editor modal and analysis third-order chart. */
export interface SeidelData {
  surfaceBySurface: SeidelSurfaceBySurfaceData;
  transverse: Record<string, number>; // TSA, TCO, TAS, SAS, PTB, DST
  /** Surface-by-surface wavefront coefficients in waves of the central wavelength, with the same surface labels as `surfaceBySurface`: W040, W131, W222, W220P (Petzval curvature, `S-IV / 4`), W220 (field curvature, `(S-III + S-IV) / 4`), W311, then primary chromatic W020 (axial color, `C-I / 2`) and W111 (lateral color, `C-II`). */
  wavefront: SeidelSurfaceBySurfaceData;
  curvature: Record<string, number>; // TCV, SCV, PCV
}

/** Display labels keyed by Seidel aberration type. */
export interface AberrationTypeToLabel extends Record<string, string> {
  TSA: string;
  TCO: string;
  TAS: string;
  SAS: string;
  PTB: string;
  DST: string;
  W040: string;
  W131: string;
  W222: string;
  W220P: string;
  W220: string;
  W311: string;
  W020: string;
  W111: string;
  TCV: string;
  SCV: string;
  PCV: string;
}
