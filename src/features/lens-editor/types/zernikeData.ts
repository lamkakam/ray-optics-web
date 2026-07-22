/**
 * Describes the Zernike Data module.
 *
 * @remarks
 * ## Notes
 *
 * - `ZernikeData` is the return type of `getZernikeCoefficients` in the worker API.
 * - Runtime constants and helpers are defined in `features/lens-editor/lib/zernikeData.ts`.
 */
/** TypeScript types for Zernike coefficient data exchanged between the lens editor UI and Pyodide worker. */
export interface ZernikeData {
  readonly coefficients: readonly number[];
  readonly rms_normalized_coefficients: readonly number[];
  readonly rms_wfe: number;
  readonly pv_wfe: number;
  readonly strehl_ratio: number;
  readonly num_terms: number;
  readonly field_index: number;
  readonly wavelength_nm: number;
}

export type ZernikeOrdering = "noll" | "fringe";
