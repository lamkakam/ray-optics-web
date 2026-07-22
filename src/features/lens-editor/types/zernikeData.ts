/** Zernike coefficient payload returned by the worker API. */
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

/** Frontend-selected coefficient indexing convention. */
export type ZernikeOrdering = "noll" | "fringe";
